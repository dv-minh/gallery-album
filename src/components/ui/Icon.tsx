interface Props { name: string; fill?: boolean; className?: string }

export function Icon({ name, fill, className = '' }: Props) {
  return <span aria-hidden className={`material-symbols-outlined ${fill ? 'fill' : ''} ${className}`}>{name}</span>;
}
