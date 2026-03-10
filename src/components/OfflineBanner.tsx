import {WifiOff} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {useOnlineStatus} from '../hooks/useOnlineStatus';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{y: -40, opacity: 0}}
          animate={{y: 0, opacity: 1}}
          exit={{y: -40, opacity: 0}}
          transition={{duration: 0.3}}
          className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white text-center py-2 px-4 flex items-center justify-center gap-2 text-sm font-semibold shadow-lg"
        >
          <WifiOff className="w-4 h-4" />
          Sin conexión — Modo offline activo
        </motion.div>
      )}
    </AnimatePresence>
  );
}
