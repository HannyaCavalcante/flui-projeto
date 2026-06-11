import AppKit
import CoreImage
import UniformTypeIdentifiers

let url = "http://10.152.248.150:4173/mobile.html"
let output = "flui-app-local-qr.png"

let data = Data(url.utf8)
guard let filter = CIFilter(name: "CIQRCodeGenerator") else {
  fatalError("CIQRCodeGenerator unavailable")
}

filter.setValue(data, forKey: "inputMessage")
filter.setValue("M", forKey: "inputCorrectionLevel")

guard let image = filter.outputImage else {
  fatalError("QR output unavailable")
}

let scaled = image.transformed(by: CGAffineTransform(scaleX: 12, y: 12))
let context = CIContext(options: nil)

guard
  let cgImage = context.createCGImage(scaled, from: scaled.extent)
else {
  fatalError("CGImage conversion failed")
}

let bitmap = NSBitmapImageRep(cgImage: cgImage)
guard
  let pngData = bitmap.representation(using: .png, properties: [:])
else {
  fatalError("PNG conversion failed")
}

try pngData.write(to: URL(fileURLWithPath: output))
