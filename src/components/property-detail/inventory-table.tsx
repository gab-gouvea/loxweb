import { useState, useRef } from "react"
import { Plus, Pencil, Trash2, Download, Loader2 } from "lucide-react"
import html2canvas from "html2canvas-pro"
import { jsPDF } from "jspdf"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useInventoryItems, useDeleteInventoryItem } from "@/hooks/use-property-details"
import type { InventoryItem } from "@/types/property-detail"
import { InventoryDialog } from "./inventory-dialog"
import { toast } from "sonner"

interface InventoryTableProps {
  propertyId: string
  propertyName: string
}

export function InventoryTable({ propertyId, propertyName }: InventoryTableProps) {
  const { data: items, isLoading } = useInventoryItems(propertyId)
  const deleteMutation = useDeleteInventoryItem()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const pdfRef = useRef<HTMLDivElement>(null)

  function handleEdit(item: InventoryItem) {
    setEditingItem(item)
    setDialogOpen(true)
  }

  function handleDialogClose(open: boolean) {
    setDialogOpen(open)
    if (!open) setEditingItem(undefined)
  }

  function handleDelete() {
    if (!deletingId) return
    deleteMutation.mutate(
      { id: deletingId, propertyId },
      {
        onSuccess: () => {
          toast.success("Item removido")
          setDeletingId(null)
        },
        onError: () => toast.error("Erro ao remover item"),
      }
    )
  }

  async function handleDownloadPdf() {
    const el = pdfRef.current
    if (!el) return

    setIsGeneratingPdf(true)
    try {
      // Temporarily show the hidden PDF layout
      el.style.display = "block"
      el.style.position = "absolute"
      el.style.left = "-9999px"
      el.style.width = "800px"

      // Wait for images to load
      const images = el.querySelectorAll("img")
      await Promise.all(
        Array.from(images).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) return resolve()
              img.onload = () => resolve()
              img.onerror = () => resolve()
            })
        )
      )

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      })

      el.style.display = ""
      el.style.position = ""
      el.style.left = ""
      el.style.width = ""

      const imgData = canvas.toDataURL("image/jpeg", 0.95)
      const pdf = new jsPDF("p", "mm", "a4")
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const margin = 10
      const contentWidth = pdfWidth - margin * 2
      const imgRatio = canvas.height / canvas.width
      const contentHeight = contentWidth * imgRatio

      if (contentHeight <= pdfHeight - margin * 2) {
        pdf.addImage(imgData, "JPEG", margin, margin, contentWidth, contentHeight)
      } else {
        // Multi-page: slice the canvas
        const pageContentHeight = pdfHeight - margin * 2
        const scaledPageHeight = (pageContentHeight / contentWidth) * canvas.width
        let yOffset = 0
        let page = 0

        while (yOffset < canvas.height) {
          if (page > 0) pdf.addPage()

          const sliceHeight = Math.min(scaledPageHeight, canvas.height - yOffset)
          const pageCanvas = document.createElement("canvas")
          pageCanvas.width = canvas.width
          pageCanvas.height = sliceHeight
          const ctx = pageCanvas.getContext("2d")!
          ctx.drawImage(canvas, 0, -yOffset)

          const pageImg = pageCanvas.toDataURL("image/jpeg", 0.95)
          const drawHeight = (sliceHeight / canvas.width) * contentWidth
          pdf.addImage(pageImg, "JPEG", margin, margin, contentWidth, drawHeight)

          yOffset += scaledPageHeight
          page++
        }
      }

      const fileName = `inventario-${propertyName.toLowerCase().replace(/\s+/g, "-")}.pdf`
      pdf.save(fileName)
      toast.success("PDF baixado com sucesso")
    } catch {
      toast.error("Erro ao gerar PDF")
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-lg bg-muted" />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Inventário</h2>
        <div className="flex gap-2">
          {items && items.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleDownloadPdf} disabled={isGeneratingPdf}>
              {isGeneratingPdf ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isGeneratingPdf ? "Gerando..." : "Baixar PDF"}
            </Button>
          )}
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Item
          </Button>
        </div>
      </div>

      {items && items.length > 0 ? (
        <>
          {/* Screen table view */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Foto</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[100px]">Quantidade</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.imagemUrl ? (
                        <img
                          src={item.imagemUrl}
                          alt={item.nome}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell>{item.quantidade}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingId(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Hidden layout for PDF generation */}
          <div className="hidden" ref={pdfRef} id="inventory-print-area">
            <div className="inventory-print-header">
              <h1>Inventário — {propertyName}</h1>
              <p>Impresso em {new Date().toLocaleDateString("pt-BR")}</p>
            </div>
            <div className="inventory-print-summary">
              Total de itens: {items.length}
            </div>
            <div className="inventory-print-grid">
              {items.map((item) => (
                <div key={item.id} className="inventory-print-card">
                  <div className="inventory-print-card-photo">
                    {item.imagemUrl ? (
                      <img src={item.imagemUrl} alt={item.nome} />
                    ) : (
                      <div className="inventory-print-card-placeholder">
                        Sem foto
                      </div>
                    )}
                  </div>
                  <div className="inventory-print-card-info">
                    <span className="inventory-print-card-name">{item.nome}</span>
                    <span className="inventory-print-card-qty">Qtd: {item.quantidade}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum item no inventário.</p>
      )}

      <InventoryDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        propertyId={propertyId}
        item={editingItem}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover item?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
