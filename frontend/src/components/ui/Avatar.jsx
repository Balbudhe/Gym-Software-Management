import { assetUrl, initials } from '../../lib/utils';

export default function Avatar({ name, src, size = 'md' }) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-lg' };
  if (src) {
    return <img src={assetUrl(src)} alt={name} className={`${sizes[size]} rounded-full object-cover`} />;
  }
  return (
    <div className={`${sizes[size]} flex items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800`}>
      {initials(name)}
    </div>
  );
}
