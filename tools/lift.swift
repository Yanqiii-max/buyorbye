import Vision
import CoreImage
import AppKit
// usage: lift in1 out1 in2 out2 ...
let a = CommandLine.arguments
let ctx = CIContext()
var i = 1
while i + 1 < a.count {
  let url = URL(fileURLWithPath: a[i])
  let h = VNImageRequestHandler(url: url)
  let req = VNGenerateForegroundInstanceMaskRequest()
  do {
    try h.perform([req])
    if let r = req.results?.first {
      let buf = try r.generateScaledMaskForImage(forInstances: r.allInstances, from: h)
      try ctx.writePNGRepresentation(of: CIImage(cvPixelBuffer: buf), to: URL(fileURLWithPath: a[i+1]), format: .L8, colorSpace: CGColorSpaceCreateDeviceGray())
      print("ok", r.allInstances.count, a[i])
    } else { print("NOSUBJECT", a[i]) }
  } catch { print("ERR", a[i], error) }
  i += 2
}
