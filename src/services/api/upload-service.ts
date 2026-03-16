import { api } from "@/lib/api"

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  const { data } = await api.post<{ url: string }>("/upload", formData)
  return data.url
}
