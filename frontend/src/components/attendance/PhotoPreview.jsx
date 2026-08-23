import Modal from '../ui/Modal';
import { assetUrl } from '../../lib/utils';

export default function PhotoPreview({ src, title = 'Attendance photo', onClose }) {
  return (
    <Modal open={!!src} title={title} onClose={onClose} wide>
      {src && <img src={assetUrl(src)} alt={title} className="max-h-[70vh] w-full rounded-xl object-contain bg-slate-50" />}
    </Modal>
  );
}
