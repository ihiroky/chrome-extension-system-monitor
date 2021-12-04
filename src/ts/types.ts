export type EchoRequest = {
  type: 'echo'
  message: string
}

export type OsRequest = {
  type: 'os'
}

export type CpuRequest = {
  type: 'cpu'
}

export type MemoryRequest = {
  type: 'memory'
}

export type DiskRequest = {
  type: 'disk'
}

export type NetworkRequest = {
  type: 'network'
}

export type EchoResponse = EchoRequest

export type OsResponse = {
  type: 'os'
  stat: string
}

export type CpuUtilization = {
  name: string
  user: number
  nice: number
  system: number
  idle: number
  iowait: number
  steal: number
  clock: number
}

export type CpuResponse = {
  type: 'cpu'
  stat: {
    time: string
    all: CpuUtilization
    cores: CpuUtilization[]
    running: number
    blocked: number
  }
}

export type MemoryResponse = {
  type: 'memory'
  stat: {
    time: string
    total: number
    used: number
    free: number
    shared: number
    buffers: number
    cache: number
    available: number
  }
}

export type DiskUtilization = {
  name: string
  rbyte: number
  rtick: number
  wbyte: number
  wtick: number
  iotick: number
}

export type DiskResponse = {
  type: 'disk'
  stat: {
    time: string
    disks: DiskUtilization[]
  }
}

export type NetworkUtilization = {
  name: string
  rx: number
  tx: number
}

export type NetworkResponse = {
  type: 'network'
  stat: {
    time: string
    networks: NetworkUtilization[]
  }
}

export type MonitorRequest =
  | EchoRequest
  | OsRequest
  | CpuRequest
  | MemoryRequest
  | DiskRequest
  | NetworkRequest

export type MonitorResponse =
  | EchoResponse
  | OsResponse
  | CpuResponse
  | MemoryResponse
  | DiskResponse
  | NetworkResponse
