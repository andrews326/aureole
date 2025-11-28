// src/components/Chat/ChatImageZoom.tsx


interface Props {
    src: string | null;
    onClose: () => void;
  }
  
  const ChatImageZoom = ({ src, onClose }: Props) => {
    if (!src) return null;
  
    return (
      <div
        className="fixed inset-0 bg-black/90 z-[10000] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="relative max-w-4xl max-h-full">
          <button
            className="absolute -top-12 right-0 text-white p-2 hover:bg-white/20 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            ✕
          </button>
  
          <img
            src={src}
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    );
  };
  
  export default ChatImageZoom;  