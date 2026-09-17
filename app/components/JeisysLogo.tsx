import Image from "next/image";

// 원본 로고 파일의 실제 크기 (비율 유지를 위해 그대로 넘기고, 표시 크기는 className의 높이로 정한다)
const LOGO_WIDTH = 821;
const LOGO_HEIGHT = 323;

type JeisysLogoProps = {
  /** 네이비 배경 위에서는 white, 밝은 배경에서는 navy */
  variant?: "navy" | "white";
  className?: string;
};

export default function JeisysLogo({ variant = "navy", className = "h-5" }: JeisysLogoProps) {
  return (
    <Image
      src={variant === "white" ? "/jeisys-logo-white.png" : "/jeisys-logo-navy.png"}
      alt="Jeisys"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      priority
      className={`w-auto ${className}`}
    />
  );
}
