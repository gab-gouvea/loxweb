import type { PropertyComponent, ComponentFormData, InventoryItem, InventoryFormData, MaintenanceRecord } from "@/types/property-detail"
import type { PropertyDetailService } from "../property-detail-service"
import { mockDelay } from "./delay"

function makeDate(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day).toISOString()
}

const initialComponents: PropertyComponent[] = [
  {
    id: "comp-1",
    propriedadeId: "prop-1",
    nome: "Manutenção de Ar Condicionado",
    ultimaManutencao: makeDate(2025, 12, 15),
    proximaManutencao: makeDate(2026, 6, 15),
    intervaloDias: 180,
    prestador: "Clima Frio Refrigeração",
    observacoes: "Split 12000 BTUs - sala",
  },
  {
    id: "comp-2",
    propriedadeId: "prop-1",
    nome: "Higienização Geral",
    ultimaManutencao: makeDate(2026, 2, 1),
    proximaManutencao: makeDate(2026, 3, 1),
    intervaloDias: 30,
    prestador: "Clean House",
    observacoes: "Limpeza profunda mensal",
  },
  {
    id: "comp-3",
    propriedadeId: "prop-2",
    nome: "Manutenção do Jardim",
    ultimaManutencao: makeDate(2026, 2, 20),
    proximaManutencao: makeDate(2026, 4, 20),
    intervaloDias: 60,
    prestador: "Verde Vivo Jardinagem",
  },
  {
    id: "comp-4",
    propriedadeId: "prop-2",
    nome: "Cuidado com Plantas",
    ultimaManutencao: makeDate(2026, 1, 10),
    proximaManutencao: makeDate(2026, 2, 10),
    intervaloDias: 15,
    prestador: "Verde Vivo Jardinagem",
    observacoes: "Rega e poda quinzenal",
  },
  {
    id: "comp-5",
    propriedadeId: "prop-3",
    nome: "Manutenção de Ar Condicionado",
    ultimaManutencao: makeDate(2026, 1, 5),
    proximaManutencao: makeDate(2026, 7, 5),
    intervaloDias: 180,
    prestador: "Clima Frio Refrigeração",
  },
]

const initialInventory: InventoryItem[] = [
  {
    id: "inv-1",
    propriedadeId: "prop-1",
    secao: "Banheiro",
    nome: "Toalha de Banho",
    quantidade: 8,
    imagemUrl: "https://images.unsplash.com/photo-1616627561950-9f746e330187?w=100&h=100&fit=crop",
    atualizadoEm: makeDate(2026, 3, 5),
  },
  {
    id: "inv-2",
    propriedadeId: "prop-1",
    secao: "Quarto",
    nome: "Jogo de Cama Casal",
    quantidade: 4,
    imagemUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=100&h=100&fit=crop",
    atualizadoEm: makeDate(2026, 2, 20),
  },
  {
    id: "inv-3",
    propriedadeId: "prop-1",
    secao: "Quarto",
    nome: "Travesseiro",
    quantidade: 6,
    atualizadoEm: makeDate(2026, 1, 15),
  },
  {
    id: "inv-4",
    propriedadeId: "prop-2",
    secao: "Banheiro",
    nome: "Toalha de Banho",
    quantidade: 12,
    atualizadoEm: makeDate(2026, 3, 1),
  },
  {
    id: "inv-5",
    propriedadeId: "prop-2",
    secao: "Cozinha",
    nome: "Panela Inox",
    quantidade: 3,
    descricao: "3 panelas na gaveta inferior do fogão",
    atualizadoEm: makeDate(2026, 2, 10),
  },
]

const initialMaintenanceRecords: MaintenanceRecord[] = [
  {
    id: "maint-1",
    propriedadeId: "prop-1",
    componenteId: "comp-2",
    nomeServico: "Higienização Geral",
    prestador: "Clean House",
    data: makeDate(2026, 3, 1),
    valor: 220,
    pago: true,
  },
  {
    id: "maint-2",
    propriedadeId: "prop-2",
    componenteId: "comp-4",
    nomeServico: "Cuidado com Plantas",
    prestador: "Verde Vivo Jardinagem",
    data: makeDate(2026, 3, 5),
    valor: 80,
    pago: false,
  },
]

export class MockPropertyDetailService implements PropertyDetailService {
  private components: PropertyComponent[] = [...initialComponents]
  private inventory: InventoryItem[] = [...initialInventory]
  private maintenanceRecords: MaintenanceRecord[] = [...initialMaintenanceRecords]

  // Componentes
  async getComponents(propertyId: string): Promise<PropertyComponent[]> {
    await mockDelay()
    return this.components.filter((c) => c.propriedadeId === propertyId)
  }

  async getAllComponents(): Promise<PropertyComponent[]> {
    await mockDelay()
    return [...this.components]
  }

  async createComponent(propertyId: string, data: ComponentFormData): Promise<PropertyComponent> {
    await mockDelay()
    const component: PropertyComponent = {
      ...data,
      id: crypto.randomUUID(),
      propriedadeId: propertyId,
    }
    this.components.push(component)
    return component
  }

  async updateComponent(id: string, data: Partial<ComponentFormData>): Promise<PropertyComponent> {
    await mockDelay()
    const index = this.components.findIndex((c) => c.id === id)
    if (index === -1) throw new Error("Componente não encontrado")
    this.components[index] = { ...this.components[index], ...data }
    return this.components[index]
  }

  async deleteComponent(id: string): Promise<void> {
    await mockDelay()
    this.components = this.components.filter((c) => c.id !== id)
  }

  // Registros de manutencao
  async getMaintenanceRecords(startDate?: string, endDate?: string, propertyId?: string): Promise<MaintenanceRecord[]> {
    await mockDelay()
    let records = [...this.maintenanceRecords]
    if (startDate) {
      records = records.filter((r) => r.data >= startDate)
    }
    if (endDate) {
      records = records.filter((r) => r.data <= endDate)
    }
    if (propertyId) {
      records = records.filter((r) => r.propriedadeId === propertyId)
    }
    return records
  }

  async createMaintenanceRecord(data: Omit<MaintenanceRecord, "id">): Promise<MaintenanceRecord> {
    await mockDelay()
    const record: MaintenanceRecord = { ...data, id: crypto.randomUUID() }
    this.maintenanceRecords.push(record)
    return record
  }

  async updateMaintenanceRecord(id: string, data: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
    await mockDelay()
    const index = this.maintenanceRecords.findIndex((r) => r.id === id)
    if (index === -1) throw new Error("Registro não encontrado")
    this.maintenanceRecords[index] = { ...this.maintenanceRecords[index], ...data }
    return this.maintenanceRecords[index]
  }

  async deleteMaintenanceRecord(id: string): Promise<void> {
    await mockDelay()
    const index = this.maintenanceRecords.findIndex((r) => r.id === id)
    if (index === -1) throw new Error("Registro não encontrado")
    this.maintenanceRecords.splice(index, 1)
  }

  // Inventário
  async getInventory(propertyId: string): Promise<InventoryItem[]> {
    await mockDelay()
    return this.inventory.filter((i) => i.propriedadeId === propertyId)
  }

  async createInventoryItem(propertyId: string, data: InventoryFormData): Promise<InventoryItem> {
    await mockDelay()
    const item: InventoryItem = {
      ...data,
      id: crypto.randomUUID(),
      propriedadeId: propertyId,
      descricao: data.descricao || undefined,
      imagemUrl: data.imagemUrl || undefined,
      atualizadoEm: new Date().toISOString(),
    }
    this.inventory.push(item)
    return item
  }

  async updateInventoryItem(id: string, data: Partial<InventoryFormData>): Promise<InventoryItem> {
    await mockDelay()
    const index = this.inventory.findIndex((i) => i.id === id)
    if (index === -1) throw new Error("Item não encontrado")
    this.inventory[index] = {
      ...this.inventory[index],
      ...data,
      descricao: data.descricao === "" ? undefined : (data.descricao ?? this.inventory[index].descricao),
      imagemUrl: data.imagemUrl === "" ? undefined : (data.imagemUrl ?? this.inventory[index].imagemUrl),
      atualizadoEm: new Date().toISOString(),
    }
    return this.inventory[index]
  }

  async deleteInventoryItem(id: string): Promise<void> {
    await mockDelay()
    this.inventory = this.inventory.filter((i) => i.id !== id)
  }
}
