type Type = 'echo'

type NativeEchoRequest = {
  type: 'echo'
  message: string
}

type NativeEchoResponse = NativeEchoRequest
type NativeResponse = NativeEchoRequest

setInterval((): void => {
  const request: NativeEchoRequest = {
    type: 'echo',
    message: 'Hello.'
  }
  chrome.runtime.sendNativeMessage(
    'com.github.ihiroky.system_monitor',
    request,
    (message: NativeResponse): void => {
      console.log('received:', message)
    }
  )
}, 3000)
