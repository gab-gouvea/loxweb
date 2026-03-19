import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { propertyFormSchema, propertyTypes, type PropertyFormData, type Property } from "@/types/property"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useProprietarios } from "@/hooks/use-proprietarios"
import { tipoLabels } from "@/lib/constants"
import { FormTextField, FormNumberField, FormTextareaField } from "@/components/shared/form-fields"
import { ImageUpload } from "@/components/shared/image-upload"

interface PropertyFormProps {
  property?: Property
  onSubmit: (data: PropertyFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export function PropertyForm({ property, onSubmit, onCancel, isSubmitting }: PropertyFormProps) {
  const { data: proprietarios = [] } = useProprietarios()

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      nome: property?.nome ?? "",
      endereco: property?.endereco ?? "",
      proprietarioId: property?.proprietarioId ?? "",
      tipo: property?.tipo ?? "apartamento",
      quartos: property?.quartos ?? 1,
      fotoCapa: property?.fotoCapa ?? "",
      percentualComissao: property?.percentualComissao ?? 0,
      taxaLimpeza: property?.taxaLimpeza ?? 0,
      temHobbyBox: property?.temHobbyBox ?? false,
      acessoPredio: property?.acessoPredio ?? "",
      acessoApartamento: property?.acessoApartamento ?? "",
      senhaWifi: property?.senhaWifi ?? "",
      ativo: property?.ativo ?? true,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormTextField<PropertyFormData>
          control={form.control}
          name="nome"
          label="Nome"
          placeholder="Ex: Apartamento Copacabana"
        />

        <FormTextField<PropertyFormData>
          control={form.control}
          name="endereco"
          label="Endereco"
          placeholder="Ex: Rua Barata Ribeiro, 200"
        />

        <FormField
          control={form.control}
          name="proprietarioId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proprietário</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um proprietário" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {proprietarios.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nomeCompleto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {propertyTypes.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipoLabels[tipo]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormNumberField<PropertyFormData>
            control={form.control}
            name="quartos"
            label="Quartos"
            min={0}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormNumberField<PropertyFormData>
            control={form.control}
            name="percentualComissao"
            label="Comissão (%)"
            min={0}
            max={100}
            step={1}
            placeholder="0"
          />

          <FormNumberField<PropertyFormData>
            control={form.control}
            name="taxaLimpeza"
            label="Taxa de Limpeza (R$)"
            min={0}
            step={0.01}
            placeholder="0"
          />
        </div>

        <ImageUpload
          value={form.watch("fotoCapa")}
          onChange={(url) => form.setValue("fotoCapa", url)}
          label="Foto de Capa"
        />

        <FormField
          control={form.control}
          name="temHobbyBox"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="font-normal">Tem hobby box?</FormLabel>
            </FormItem>
          )}
        />

        <FormTextareaField<PropertyFormData>
          control={form.control}
          name="acessoPredio"
          label="Como entrar no prédio"
          placeholder="Ex: Portaria 24h, informar nome na recepção"
          rows={2}
        />

        <FormTextareaField<PropertyFormData>
          control={form.control}
          name="acessoApartamento"
          label="Como entrar no apartamento"
          placeholder="Ex: Senha da fechadura digital: 1234#"
          rows={2}
        />

        <FormTextField<PropertyFormData>
          control={form.control}
          name="senhaWifi"
          label="Senha do Wi-Fi"
          placeholder="Ex: MinhaRede123"
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
