import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { loginSchema, type LoginFormData } from "@/types/auth"
import { login } from "@/services/auth-service"
import { setToken, setUserName, getSavedEmail, saveEmail, clearSavedEmail } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"


export function LoginPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const savedEmail = getSavedEmail()
  const [lembrarEmail, setLembrarEmail] = useState(savedEmail !== "")

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: savedEmail,
      senha: "",
    },
  })

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true)
    try {
      const { token, nome } = await login(data)

      if (lembrarEmail) {
        saveEmail(data.email)
      } else {
        clearSavedEmail()
      }

      setToken(token)
      setUserName(nome)
      navigate("/", { replace: true })
    } catch {
      toast.error("E-mail ou senha incorretos")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-svh items-center justify-center bg-gradient-to-br from-muted/50 to-muted p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="items-center text-center space-y-3">
          <img src="/lox.svg" alt="Lox" className="h-14 w-14 rounded-xl" />
          <div>
            <CardTitle className="text-2xl font-bold">Lox</CardTitle>
            <CardDescription className="mt-1">Gestão de Reservas</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="senha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="lembrar-email"
                  checked={lembrarEmail}
                  onCheckedChange={(checked) => setLembrarEmail(checked === true)}
                />
                <Label
                  htmlFor="lembrar-email"
                  className="text-sm font-normal text-muted-foreground cursor-pointer"
                >
                  Lembrar meu e-mail
                </Label>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="animate-spin" />}
                Entrar
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <p className="mt-4 text-xs text-muted-foreground/60">v{__APP_VERSION__}</p>
    </div>
  )
}
