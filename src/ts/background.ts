import {
  OsRequest,
  CpuRequest,
  MemoryRequest,
  DiskRequest,
  NetworkRequest,
  MonitorResponse,
} from './types'

const port = chrome.runtime.connectNative('com.github.ihiroky.system_monitor')
port.onMessage.addListener((message: MonitorResponse): void => {
  console.log('received:', message)
})
port.onDisconnect.addListener((port: chrome.runtime.Port): void => {
  console.log('disconnected:', port)
})

setInterval((): void => {
  const osRequest: OsRequest = {
    type: 'os'
  }
  port.postMessage(osRequest)

  const cpuRequest: CpuRequest = {
    type: 'cpu'
  }
  port.postMessage(cpuRequest)

  const memoryRequest: MemoryRequest = {
    type: 'memory'
  }
  port.postMessage(memoryRequest)

  const diskRequest: DiskRequest = {
    type: 'disk'
  }
  port.postMessage(diskRequest)
  const networkRequest: NetworkRequest = {
    type: 'network'
  }
  port.postMessage(networkRequest)
}, 3000)
