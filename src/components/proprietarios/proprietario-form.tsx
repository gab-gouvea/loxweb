import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { localDateToISO } from "@/lib/date-utils"
import { proprietarioFormSchema, estadosCivis, type ProprietarioFormData, type Proprietario } from "@/types/proprietario"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { estadoCivilLabels } from "@/lib/constants"
import { FormTextField, FormDateField } from "@/components/shared/form-fields"

interface ProprietarioFormProps {
  proprietario?: Proprietario
  onSubmit: (data: ProprietarioFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
}

function isoToDateInput(iso?: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function ProprietarioForm({ proprietario, onSubmit, onCancel, isSubmitting }: ProprietarioFormProps) {
  const form = useForm<ProprietarioFormData>({
    resolver: zodResolver(proprietarioFormSchema),
    defaultValues: {
      nomeCompleto: proprietario?.nomeCompleto ?? "",
      cpf: proprietario?.cpf ?? "",
      rg: proprietario?.rg ?? "",
      dataNascimento: isoToDateInput(proprietario?.dataNascimento),
      profissao: proprietario?.profissao ?? "",
      estadoCivil: proprietario?.estadoCivil,
      endereco: proprietario?.endereco ?? "",
      email: proprietario?.email ?? "",
    },
  })

  function handleFormSubmit(data: ProprietarioFormData) {
    if (data.dataNascimento) {
      data.dataNascimento = localDateToISO(data.dataNascimento)
    }
    onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormTextField<ProprietarioFormData>
          control={form.control}
          name="nomeCompleto"
          label="Nome Completo"
          placeholder="Nome completo do proprietário"
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cpf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CPF</FormLabel>
                <FormControl>
                  <Input
                    placeholder="000.000.000-00"
                    maxLength={14}
                    value={field.value}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 11)
                      const formatted = digits
                        .replace(/(\d{3})(\d)/, "$1.$2")
                        .replace(/(\d{3})(\d)/, "$1.$2")
                        .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
                      field.onChange(formatted)
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormTextField<ProprietarioFormData>
            control={form.control}
            name="rg"
            label="RG"
            placeholder="00.000.000-0"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormDateField<ProprietarioFormData>
            control={form.control}
            name="dataNascimento"
            label="Data de Nascimento"
          />

          <FormTextField<ProprietarioFormData>
            control={form.control}
            name="profissao"
            label="Profissão"
            placeholder="Ex: Empresário"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="estadoCivil"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado Civil</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {estadosCivis.map((ec) => (
                      <SelectItem key={ec} value={ec}>
                        {estadoCivilLabels[ec]}
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@exemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormTextField<ProprietarioFormData>
          control={form.control}
          name="endereco"
          label="Endereço Completo"
          placeholder="Rua X, 123 - Bairro, Cidade/UF - CEP 00000-000"
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
