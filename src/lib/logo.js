// Logo component using the PNG at /public/logo.png
// Next.js serves files in public/ at the root URL automatically.
export function LogoSVG({ size = 56 }) {
  return (
    <img
      src="/logo.png"
      alt="The Championships - Atentado"
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        display: "block",
      }}
    />
  );
}
