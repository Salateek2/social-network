// Video component (§26.i) — React renders posts' attached videos.
function VideoPlayer({ src }) {
  return (
    <video className="post-media" src={src} controls preload="metadata">
      Your browser does not support video playback.
    </video>
  );
}

export default VideoPlayer;
