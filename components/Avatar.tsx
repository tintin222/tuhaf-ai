import { avatarDataUri } from "@/lib/avatar";

export function Avatar({
  seed,
  name,
  size = 40,
  className = "",
}: {
  seed: string;
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarDataUri(seed, name)}
      alt={name}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
