interface SastrIALogoProps {
  className?: string;
}

export function SastrIALogo({ className = 'text-lg' }: SastrIALogoProps) {
  return (
    <span className={`font-bold ${className}`}>
      <span className="text-primary">Sastr</span>
      <span className="text-orange-400">IA</span>
    </span>
  );
}
