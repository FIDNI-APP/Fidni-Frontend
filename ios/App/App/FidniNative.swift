import UIKit
import WebKit
import Capacitor

/// Contrôleur de l'application : la page s'arrête sous la barre d'état (comme Safari) et descend jusqu'en bas de
/// l'écran, où la barre d'onglets du site garde sa marge `env(safe-area-inset-bottom)` (viewport-fit=cover, main.tsx).
/// Le fond visible derrière la barre d'état suit le thème du site (FidniNativePlugin.setBackground).
class FidniViewController: CAPBridgeViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        guard let webView = webView else { return }
        let container = UIView(frame: webView.frame)
        container.backgroundColor = .white
        view = container
        container.addSubview(webView)
        webView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: container.safeAreaLayoutGuide.topAnchor),
            webView.leadingAnchor.constraint(equalTo: container.safeAreaLayoutGuide.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: container.safeAreaLayoutGuide.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: container.bottomAnchor)
        ])
    }

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(FidniNativePlugin())
    }
}

/// Ce que la WebView ne fait pas comme un navigateur (src/lib/native.ts) :
/// - printPage : window.print() n'y fait rien ; fenêtre d'impression d'iOS (imprimante, ou PDF via « Partager »)
///   sur la page affichée, avec ses styles @media print. La promesse se termine à la fermeture de la fenêtre.
/// - setBackground : couleur derrière la barre d'état, assortie au thème.
@objc(FidniNativePlugin)
public class FidniNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FidniNativePlugin"
    public let jsName = "FidniNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "printPage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setBackground", returnType: CAPPluginReturnPromise)
    ]

    @objc func printPage(_ call: CAPPluginCall) {
        let name = call.getString("name") ?? "FIDNI"
        DispatchQueue.main.async {
            guard let webView = self.bridge?.webView, let host = self.bridge?.viewController?.view else {
                call.reject("Impression indisponible")
                return
            }
            let info = UIPrintInfo(dictionary: nil)
            info.outputType = .general
            info.jobName = name
            let controller = UIPrintInteractionController.shared
            controller.printInfo = info
            controller.printFormatter = webView.viewPrintFormatter()
            let done: UIPrintInteractionController.CompletionHandler = { _, _, error in
                if let error = error { call.reject(error.localizedDescription) } else { call.resolve() }
            }
            if UIDevice.current.userInterfaceIdiom == .pad {
                let anchor = CGRect(x: host.bounds.midX, y: host.bounds.midY, width: 1, height: 1)
                controller.present(from: anchor, in: host, animated: true, completionHandler: done)
            } else {
                controller.present(animated: true, completionHandler: done)
            }
        }
    }

    @objc func setBackground(_ call: CAPPluginCall) {
        guard let color = UIColor(fidniHex: call.getString("color") ?? "") else {
            call.reject("Couleur invalide")
            return
        }
        DispatchQueue.main.async {
            self.bridge?.viewController?.view.backgroundColor = color
            call.resolve()
        }
    }
}

private extension UIColor {
    /// « #rrggbb » uniquement (les couleurs envoyées par src/lib/native.ts).
    convenience init?(fidniHex hex: String) {
        let digits = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        guard digits.count == 6, let value = UInt32(digits, radix: 16) else { return nil }
        self.init(red: CGFloat((value >> 16) & 0xff) / 255,
                  green: CGFloat((value >> 8) & 0xff) / 255,
                  blue: CGFloat(value & 0xff) / 255,
                  alpha: 1)
    }
}
