import sys

sys.path.insert(0, "/private/tmp/qrcode_pkg")

import qrcode

url = "http://10.152.248.150:4173/mobile.html"
image = qrcode.make(url)
image.save("flui-app-local-qr.png")
