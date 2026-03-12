import { useState, useMemo } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { ArrowLeft, Pencil, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useProprietario } from "@/hooks/use-proprietarios"
import { useProperties } from "@/hooks/use-properties"
import { ProprietarioDialog } from "@/components/proprietarios/proprietario-dialog"
import { formatDate } from "@/lib/date-utils"

const estadoCivilLabels: Record<string, string> = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
  separado: "Separado(a)",
  uniao_estavel: "União Estável",
}

const tipoLabels: Record<string, string> = {
  apartamento: "Apartamento",
  casa: "Casa",
  studio: "Studio",
  chalé: "Chalé",
  flat: "Flat",
  outro: "Outro",
}

export function ProprietarioDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: proprietario, isLoading } = useProprietario(id!)
  const { data: properties = [] } = useProperties()
  const [dialogOpen, setDialogOpen] = useState(false)

  const linkedProperties = useMemo(() => {
    return properties.filter((p) => p.proprietarioId === id)
  }, [properties, id])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!proprietario) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/proprietarios")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <p className="text-muted-foreground">Proprietário não encontrado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/proprietarios")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div className="rounded-lg border p-6">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-2xl font-bold">{proprietario.nomeCompleto}</h1>
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">CPF:</span>
            <span className="ml-2 font-medium">{proprietario.cpf}</span>
          </div>
          {proprietario.rg && (
            <div>
              <span className="text-muted-foreground">RG:</span>
              <span className="ml-2 font-medium">{proprietario.rg}</span>
            </div>
          )}
          {proprietario.dataNascimento && (
            <div>
              <span className="text-muted-foreground">Data de Nascimento:</span>
              <span className="ml-2 font-medium">{formatDate(proprietario.dataNascimento)}</span>
            </div>
          )}
          {proprietario.profissao && (
            <div>
              <span className="text-muted-foreground">Profissão:</span>
              <span className="ml-2 font-medium">{proprietario.profissao}</span>
            </div>
          )}
          {proprietario.estadoCivil && (
            <div>
              <span className="text-muted-foreground">Estado Civil:</span>
              <span className="ml-2 font-medium">{estadoCivilLabels[proprietario.estadoCivil]}</span>
            </div>
          )}
          {proprietario.email && (
            <div>
              <span className="text-muted-foreground">E-mail:</span>
              <span className="ml-2 font-medium">{proprietario.email}</span>
            </div>
          )}
          {proprietario.endereco && (
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">Endereço:</span>
              <span className="ml-2 font-medium">{proprietario.endereco}</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Propriedades ({linkedProperties.length})</h2>
        {linkedProperties.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma propriedade vinculada.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {linkedProperties.map((property) => (
              <Link key={property.id} to={`/propriedades/${property.id}`}>
                <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                  {property.fotoCapa && (
                    <div className="h-32 w-full overflow-hidden">
                      <img
                        src={property.fotoCapa}
                        alt={property.nome}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{property.nome}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <Badge variant="secondary">{tipoLabels[property.tipo]}</Badge>
                    </div>
                    {property.endereco && <p>{property.endereco}</p>}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <ProprietarioDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        proprietario={proprietario}
      />
    </div>
  )
}
