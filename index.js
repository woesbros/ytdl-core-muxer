
/*/ //////////////////////////////////////////////////////////////////
\*\ ytdl-core-muxer: mostly copied from the ytdl-core example code :) 
\*\ credit and thanks for those authors: fent, TimeForANinja, coolaj86
/*/ //////////////////////////////////////////////////////////////////


// require all the things!
const cp = require('child_process');
const stream = require('stream');
const ytdl = require("@distube/ytdl-core"); // more active version of ytdl-core
const ffmpegPath = require('ffmpeg-static');

const passthru = new stream.PassThrough({ highWaterMark: 1024 * 512 });
const progress = new stream.Readable();
progress._read = function (size) { return size; }

// default export: the ffmpeg muxer
const ytmux = (link, options = {}) => {
  const result = new stream.PassThrough({ highWaterMark: options.highWaterMark || 1024 * 512 });

  // audio+video
  if (!options.filter) {
    ytdl.getInfo(link, options).then(info => {

      // get audio and video streams
      const audio = ytdl.downloadFromInfo(info, { ...options, quality: 'highestaudio' });
      const video = ytdl.downloadFromInfo(info, { ...options, quality: 'highestvideo' })
        .on('progress', (_, downloaded, total) => {
          if (downloaded === total) {
            progress.push(JSON.stringify({ downloaded, total }, null, 2) + '\n');
            progress.push(null);
          } else {
            progress.push(JSON.stringify({ downloaded, total }, null, 2) + '\n');
          }
        });

      // Start the ffmpeg child process
      const ffmpegProcess = cp.spawn(ffmpegPath, [
        // supress non-crucial messages
        '-loglevel', '8', '-hide_banner',
        // Redirect/Enable progress messages
        '-progress', 'pipe:3',
        // input audio and video by pipe
        '-i', 'pipe:4', '-i', 'pipe:5',
        // map audio and video correspondingly
        '-map', '0:a', '-map', '1:v',
        // no need to change the codec
        '-c', 'copy',
        // output mp4 and pipe
        '-f', 'matroska', 'pipe:6',
      ], {
        // no popup window for Windows users
        windowsHide: true,
        stdio: [
          // stdin, stdout, stderr,
          'inherit', 'inherit', 'inherit',
          // progress, audio, video, output
          'pipe', 'pipe', 'pipe', 'pipe'
        ]
      });

      progress.pipe(passthru);
      audio.pipe(ffmpegProcess.stdio[4]);
      video.pipe(ffmpegProcess.stdio[5]);
      ffmpegProcess.stdio[6].pipe(result);
    });

    return [result, passthru];
  }
};

// export it
module.exports = ytmux;

// export other functions, in case you want them
ytmux.download = ytdl;
ytmux.chooseFormat = ytdl.chooseFormat;
ytmux.downloadFromInfo = ytdl.downloadFromInfo;
ytmux.filterFormats = ytdl.filterFormats;
ytmux.getBasicInfo = ytdl.getBasicInfo;
ytmux.getInfo = ytdl.getInfo;
ytmux.getURLVideoID = ytdl.getURLVideoID;
ytmux.getVideoID = ytdl.getVideoID;
ytmux.validateID = ytdl.validateID;
ytmux.validateURL = ytdl.validateURL;
