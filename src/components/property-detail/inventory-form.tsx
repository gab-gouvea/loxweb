import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { inventoryFormSchema, type InventoryFormData, type InventoryItem } from "@/types/property-detail"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

interface InventoryFormProps {
  item?: InventoryItem
  defaultComodo?: string
  onSubmit: (data: InventoryFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export function InventoryForm({ item, defaultComodo, onSubmit, onCancel, isSubmitting }: InventoryFormProps) {
  const form = useForm<InventoryFormData>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      comodo: item?.comodo ?? defaultComodo ?? "",
      nome: item?.nome ?? "",
      quantidade: item?.quantidade ?? 1,
      descricao: item?.descricao ?? "",
      imagemUrl: item?.imagemUrl ?? "",
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Toalha de Banho" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantidade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantidade</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  {...field}
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ex: 30 talheres na gaveta inferior"
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imagemUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL da Imagem</FormLabel>
              <FormControl>
                <Input placeholder="https://exemplo.com/imagem.jpg" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
