import {
  CpuResponse,
  DiskResponse,
  MemoryResponse,
  NetworkResponse,
  ChartData,
  Resource,
  ResourceName
} from './types'

const SPAN_SECONDS = 60
const KB = 1024
const MB = 1024 * 1024

function isObject(m: unknown): m is { [k: string]: unknown } {
  return typeof m === 'object' && m !== null
}

export const Resources = {
  from: (obj: unknown): Resource | null => null
}

Resources.from = (obj: unknown): Resource | null => {
  const cpu: ResourceName = 'CPU'
  const mem: ResourceName = 'Memory'
  const disk: ResourceName = 'Storage'
  const nw: ResourceName = 'Network'
  if (!isObject(obj)) {
    return null
  }
  switch (obj.name) {
    case cpu: return CpuData.from(obj)
    case mem: return MemoryData.from(obj)
    case disk: return StorageData.from(obj)
    case nw: return NetworkData.from(obj)
    default: return null
  }
}

function newInitialNumberArray(): number[] {
  const a = new Array<number>(SPAN_SECONDS)
  return a
}

function newInitialTimes(): string[] {
  const now = new Date()
  const times = new Array<string>(SPAN_SECONDS)
  for (let i = SPAN_SECONDS - 1; i >= 0; i--) {
    const t = new Date(now)
    t.setSeconds(now.getSeconds() - i)
    times[i] = t.toLocaleTimeString()
  }
  return times
}

function toCpuPercent(r: number): number {
  return r / 1000
}

function addValue<V>(values: V[], v: V): void {
  values.shift()
  values.push(v)
}

export class CpuData implements Resource {
  readonly name: 'CPU'
  times: string[]
  used: Record<string, number[]>
  idle: Record<string, number[]>
  user: Record<string, number[]>
  system: Record<string, number[]>
  iowait: Record<string, number[]>
  irq: Record<string, number[]>
  others: Record<string, number[]>
  clock: Record<string, number[]>

  private onKindsChanged: (r: Resource) => void

  static from(obj: { [k: string]: any }): CpuData {
    const cpu = new CpuData()
    cpu.times = obj.times
    cpu.used = obj.used
    cpu.idle = obj.idle
    cpu.user = obj.user
    cpu.system = obj.system
    cpu.iowait = obj.iowait
    cpu.irq = obj.irq
    cpu.others = obj.others
    cpu.clock = obj.clock
    return cpu
  }

  constructor() {
    this.name = 'CPU'
    this.times = []
    this.used = {}
    this.idle = {}
    this.user = {}
    this.system = {}
    this.iowait = {}
    this.irq = {}
    this.others = {}
    this.clock = {}

    this.onKindsChanged = () => undefined
  }

  kinds(): string[] {
    return Object.keys(this.used)
  }

  toData(kind: string): ChartData {
    return {
      labels: this.times,
      unit: '%',
      stacked: true,
      datasets: [
        {
          label: 'user',
          data: this.user[kind],
          borderColor: 'rgba(255, 0, 0, 0.6)',
        },
        {
          label: 'system',
          data: this.system[kind],
          borderColor: 'rgba(0, 255, 0, 0.6)',
        },
        {
          label: 'irq',
          data: this.irq[kind],
          borderColor: 'rgba(0, 0, 255, 0.6)',
        },
        {
          label: 'iowait',
          data: this.iowait[kind],
          borderColor: 'rgba(255, 255, 0, 0.6)',
        },
        {
          label: 'idle',
          data: this.idle[kind],
          borderColor: 'rgba(255, 0, 255, 0.6)',
        },
        {
          label: 'others',
          data: this.others[kind],
          borderColor: 'rgba(0, 255, 255, 0.6)',
        },
      ]
    }
  }

  setKindsChangedListener(listener: (r: Resource) => void): void {
    this.onKindsChanged = listener
  }

  private init(stat: CpuResponse['stat']): void {
    for (const cpu of stat.cores) {
      this.used[cpu.name] = newInitialNumberArray()
      this.idle[cpu.name] = newInitialNumberArray()
      this.user[cpu.name] = newInitialNumberArray()
      this.system[cpu.name] = newInitialNumberArray()
      this.iowait[cpu.name] = newInitialNumberArray()
      this.irq[cpu.name] = newInitialNumberArray()
      this.others[cpu.name] = newInitialNumberArray()
      this.clock[cpu.name] = newInitialNumberArray()
    }
    this.times = newInitialTimes()

    this.onKindsChanged(this)
  }

  add(stat: CpuResponse['stat']): void {
    if (this.times.length === 0) {
      this.init(stat)
    }

    addValue(this.times, new Date(Date.parse(stat.time)).toLocaleTimeString())
    for (const cpu of stat.cores) {
      const used = this.used[cpu.name]
      addValue(used, 100 - toCpuPercent(cpu.idle))
      const idle = this.idle[cpu.name]
      addValue(idle, toCpuPercent(cpu.idle))
      const user = this.user[cpu.name]
      addValue(user, toCpuPercent(cpu.user))
      const system = this.user[cpu.name]
      addValue(system, toCpuPercent(cpu.system))
      const iowait = this.iowait[cpu.name]
      addValue(iowait, toCpuPercent(cpu.iowait))
      const irq = this.irq[cpu.name]
      addValue(irq, toCpuPercent(cpu.irq + cpu.softirq))
      const others = this.others[cpu.name]
      addValue(others, toCpuPercent(cpu.steal + cpu.guest + cpu.guest_nice))
      const clock = this.clock[cpu.name]
      addValue(clock, cpu.clock / 1000) // KHz -> MHz
    }
  }
}

export class MemoryData implements Resource {
  readonly name: 'Memory'
  times: string[]
  used: number[]
  free: number[]
  availableExceptFree: number[]

  static from(obj: { [k: string]: any }): MemoryData {
    const mem = new MemoryData()
    mem.times = obj.times
    mem.used = obj.used
    mem.free = obj.free
    mem.availableExceptFree = obj.availableExceptFree
    return mem
  }

  constructor() {
    this.name = 'Memory'
    this.times = newInitialTimes()
    this.used = newInitialNumberArray()
    this.free = newInitialNumberArray()
    this.availableExceptFree = newInitialNumberArray()
  }

  kinds(): string[] {
    return ['mem']
  }

  toData(kind: string): ChartData {
    return {
      labels: this.times,
      unit: 'MB',
      stacked: true,
      datasets: [
        {
          label: 'Used',
          data: this.used,
          borderColor: 'rgba(255, 0, 0, 1)',
        },
        {
          label: 'Available (except Free)',
          data: this.availableExceptFree,
          borderColor: 'rgba(0, 255, 0, 1)',
        },
        {
          label: 'Free',
          data: this.free,
          borderColor: 'rgba(0, 0, 255, 1)',
        }
      ]
    }
  }

  setKindsChangedListener(listener: (r: Resource) => void): void {
    // Do nothing.
  }

  add(stat: MemoryResponse['stat']): void {
    addValue(this.times, new Date(Date.parse(stat.time)).toLocaleTimeString())
    addValue(this.used, (stat.total - stat.available) / MB)
    addValue(this.availableExceptFree, (stat.available - stat.free) / MB)
    addValue(this.free, stat.free / MB)
  }
}

export class StorageData implements Resource {
  readonly name: 'Storage'
  times: string[]
  read: Record<string, number[]>
  write: Record<string, number[]>

  private onKindsChanged: (r: Resource) => void

  static from(obj: { [k: string]: any }): StorageData {
    const storage = new StorageData()
    storage.times = obj.times
    storage.read = obj.read
    storage.write = obj.write
    return storage
  }

  constructor() {
    this.name = 'Storage'
    this.times = []
    this.read = {}
    this.write = {}

    this.onKindsChanged = () => undefined
  }

  kinds(): string[] {
    return Object.keys(this.read)
  }

  toData(kind: string): ChartData {
    return {
      labels: this.times,
      unit: 'KB/s',
      datasets: [
        {
          label: `Read - ${kind}`,
          data: this.read[kind],
          borderColor: 'rgba(255, 0, 0, 0.6)',
        }, {
          label: `Write - ${kind}`,
          data: this.write[kind],
          borderColor: 'rgba(0, 0, 255, 0.6)',
        }
      ]
    }
  }

  setKindsChangedListener(listener: (r: Resource) => void): void {
    this.onKindsChanged = listener
  }

  add(stat: DiskResponse['stat']): void {
    if (this.times.length === 0) {
      this.times = newInitialTimes()
      for (const d of stat.disks) {
        if (d.name.includes('loop')) {
          continue
        }
        this.read[d.name] = newInitialNumberArray()
        this.write[d.name] = newInitialNumberArray()
      }
      this.onKindsChanged(this)
    }

    addValue(this.times, new Date(Date.parse(stat.time)).toLocaleTimeString())
    for (const d of stat.disks) {
      if (d.name.includes('loop')) {
        continue
      }
      addValue(this.read[d.name], d.rbyte / KB)
      addValue(this.write[d.name], d.wbyte / KB)
    }
  }
}

export class NetworkData implements Resource {
  readonly name: 'Network'
  times: string[]
  receive: Record<string, number[]>
  transmit: Record<string, number[]>
  unit: string

  private onKindsChanged: (r: Resource) => void

  static from(obj: { [k: string]: any }): NetworkData {
    const net = new NetworkData()
    net.times = obj.times
    net.receive = obj.receive
    net.transmit = obj.transmit
    net.unit = obj.unit
    return net
  }

  constructor() {
    this.name = 'Network'
    this.times = []
    this.receive = {}
    this.transmit = {}
    this.unit = 'KB/s'

    this.onKindsChanged = () => undefined
  }

  kinds(): string[] {
    return Object.keys(this.receive)
  }

  toData(kind: string): ChartData {
    return {
      labels: this.times,
      unit: this.unit,
      datasets: [
        {
          label: `Receive - ${kind}`,
          data: this.receive[kind],
          borderColor: 'rgba(255, 0, 0, 0.6)',
        }, {
          label: `Transmit - ${kind}`,
          data: this.transmit[kind],
          borderColor: 'rgba(0, 255, 0, 0.6)',
        }
      ]
    }
  }

  setKindsChangedListener(listener: (r: Resource) => void): void {
    this.onKindsChanged = listener
  }

  add(stat: NetworkResponse['stat']): void {
    if (this.times.length === 0) {
      this.times = newInitialTimes()
      for (const nw of stat.networks) {
        this.receive[nw.name] = newInitialNumberArray()
        this.transmit[nw.name] = newInitialNumberArray()
      }
      this.onKindsChanged(this)
    }

    addValue(this.times, new Date(Date.parse(stat.time)).toLocaleTimeString())
    for (const nw of stat.networks) {
      addValue(this.receive[nw.name], nw.rx / KB)
      addValue(this.transmit[nw.name], nw.tx / KB)
    }
  }
}
