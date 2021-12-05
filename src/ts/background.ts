import { memo } from 'react'
import { CpuData, MemoryData, NetworkData, StorageData } from './linux'
import {
  OsRequest,
  CpuRequest,
  MemoryRequest,
  DiskRequest,
  NetworkRequest,
  MonitorResponse,
  Resource,
  KindChange,
  KindRequest,
} from './types'

const port = chrome.runtime.connectNative('com.github.ihiroky.system_monitor')
const cpuData: CpuData = new CpuData()
const memoryData: MemoryData = new MemoryData()
const storageData: StorageData = new StorageData()
const networkData: NetworkData = new NetworkData()

const kindChangeListener = (r: Resource): void => {
  const kc: KindChange = {
    name: r.name,
    newKinds: r.kinds()
  }
  chrome.runtime.sendMessage(kc)
}
cpuData.setKindsChangedListener(kindChangeListener)
memoryData.setKindsChangedListener(kindChangeListener)
storageData.setKindsChangedListener(kindChangeListener)
networkData.setKindsChangedListener(kindChangeListener)
chrome.runtime.onMessage.addListener((message: KindRequest): void => {
  if (message.type !== 'kind_request') {
    return
  }
  kindChangeListener(cpuData)
  kindChangeListener(memoryData)
  kindChangeListener(storageData)
  kindChangeListener(networkData)
})

port.onMessage.addListener((message: MonitorResponse): void => {
  switch (message.type) {
    case 'cpu':
      cpuData.add(message.stat)
      chrome.runtime.sendMessage(cpuData)
      break
    case 'memory':
      memoryData.add(message.stat)
      chrome.runtime.sendMessage(memoryData)
      break
    case 'disk':
      storageData.add(message.stat)
      chrome.runtime.sendMessage(storageData)
      break
    case 'network':
      networkData.add(message.stat)
      chrome.runtime.sendMessage(networkData)
      break
    case 'os':
      // TODO
      break
    default:
      console.warn('Unexpected type: ' + message.type)
  }
})
port.onDisconnect.addListener((port: chrome.runtime.Port): void => {
  console.log('disconnected:', port.name)
})
const osRequest: OsRequest = {
  type: 'os'
}
port.postMessage(osRequest)

setInterval((): void => {
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
}, 1000)
