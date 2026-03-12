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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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

const tipoLabels: Record<string, string> = {
  apartamento: "Apartamento",
  casa: "Casa",
  studio: "Studio",
  chalé: "Chalé",
  flat: "Flat",
  outro: "Outro",
}

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
      temHobbyBox: property?.temHobbyBox ?? false,
      acessoPredio: property?.acessoPredio ?? "",
      acessoApartamento: property?.acessoApartamento ?? "",
      ativo: property?.ativo ?? true,
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
                <Input placeholder="Ex: Apartamento Copacabana" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="endereco"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereco</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Rua Barata Ribeiro, 200" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
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

          <FormField
            control={form.control}
            name="quartos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quartos</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="percentualComissao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comissao (%)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  placeholder="0"
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
          name="fotoCapa"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Foto de Capa (URL)</FormLabel>
              <FormControl>
                <Input placeholder="https://exemplo.com/foto.jpg" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
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

        <FormField
          control={form.control}
          name="acessoPredio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Como entrar no prédio</FormLabel>
              <FormControl>
                <Textarea placeholder="Ex: Portaria 24h, informar nome na recepção" rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="acessoApartamento"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Como entrar no apartamento</FormLabel>
              <FormControl>
                <Textarea placeholder="Ex: Senha da fechadura digital: 1234#" rows={2} {...field} />
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
