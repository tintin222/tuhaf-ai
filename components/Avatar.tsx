import { avatarDataUri } from "@/lib/avatar";

export function Avatar({
  seed,
  name,
  image,
  size = 40,
  className = "",
}: {
  seed: string;
  name: string;
  /** Real photo (data URL or /public path). Falls back to a generated avatar. */
  image?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image || avatarDataUri(seed, name)}
      alt={name}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
