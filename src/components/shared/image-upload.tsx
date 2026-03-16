import { useRef, useState } from "react"
import { Camera, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { uploadImage } from "@/services/api/upload-service"
import { getErrorMessage } from "@/lib/api"

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  label?: string
}

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export function ImageUpload({ value, onChange, label = "Foto" }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem")
      return
    }
    if (file.size > MAX_SIZE) {
      toast.error("Imagem deve ter no máximo 5MB")
      return
    }

    setIsUploading(true)
    try {
      const url = await uploadImage(file)
      onChange(url)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleRemove() {
    onChange("")
    if (inputRef.current) inputRef.current.value = ""
  }

  if (value) {
    return (
      <div className="space-y-1.5">
        {label && <p className="text-sm font-medium">{label}</p>}
        <div className="relative rounded-md overflow-hidden border">
          <img
            src={value}
            alt="Preview"
            className="h-40 w-full object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {label && <p className="text-sm font-medium">{label}</p>}
      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted/50 transition-colors disabled:opacity-50"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Enviando...</span>
          </>
        ) : (
          <>
            <Camera className="h-6 w-6" />
            <span className="text-sm">Clique para adicionar foto</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )
}
