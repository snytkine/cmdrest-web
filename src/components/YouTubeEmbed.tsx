/**
 * Responsive YouTube video embed.
 *
 * Rather than pasting YouTube's own `<iframe width="560" height="315">`
 * snippet (fixed pixel dimensions that either overflow small screens or
 * leave the video tiny on large ones), this wraps the iframe in a
 * padding-based 16:9 box: the video scales fluidly with its container at
 * a locked aspect ratio, with no layout shift once it loads.
 */

/** Props of the {@link YouTubeEmbed} component. */
export interface YouTubeEmbedProps {
  /** YouTube video id, e.g. the `4MvfghJnmbo` in `youtube.com/watch?v=4MvfghJnmbo`. */
  readonly videoId: string;
  /** Accessible title of the embedded video (used as the iframe's `title`). */
  readonly title: string;
}

/** A responsive, lazy-loaded YouTube video embed. */
export function YouTubeEmbed({ videoId, title }: YouTubeEmbedProps): React.JSX.Element {
  return (
    <div className="youtube-embed">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}
