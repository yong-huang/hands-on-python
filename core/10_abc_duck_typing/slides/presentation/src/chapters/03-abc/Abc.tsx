import type { ChapterStepProps } from "../../registry/types";
import "./Abc.css";
export default function AbcChapter({ step }: ChapterStepProps) {
  if (step === 0) return (
    <div className="scene-pad ab-scene ab-code-scene">
      <div className="ab-code-lead ab-rise"><span className="ab-dim">ABC 提供类型约束：</span></div>
      <pre className="ab-code ab-rise" style={{ animationDelay: "400ms" }}>{`class Transport(ABC):
    @abstractmethod
    def deliver(self, destination): ...

    @abstractmethod
    def max_capacity(self): ...

    def shipping_label(self, dest):  # 非抽象
        ...  # 所有子类共享`}</pre>
    </div>
  );
  if (step === 1) return (
    <div className="scene-pad ab-scene ab-type-scene">
      <div className="ab-type-line ab-rise">Transport() 直接 TypeError</div>
      <div className="ab-type-reason ab-rise" style={{ animationDelay: "700ms" }}>有未实现的抽象方法 → <b>实例化时就失败</b></div>
    </div>
  );
  if (step === 2) return (
    <div className="scene-pad ab-scene ab-reg-scene">
      <div className="ab-reg-code ab-rise" style={{ animationDelay: "300ms" }}>
        <span className="ab-reg-mono">Transport.register(ExternalLogistics)</span>
      </div>
      <div className="ab-reg-result ab-rise" style={{ animationDelay: "1200ms" }}>
        <span className="ab-reg-check">✓</span> isinstance: True
        <span className="ab-reg-check">✓</span> issubclass: True
      </div>
      <div className="ab-reg-note ab-rise" style={{ animationDelay: "2200ms" }}>第三方类<b>不继承也能过</b></div>
    </div>
  );
  if (step === 3) return (
    <div className="scene-pad ab-scene ab-ship-scene">
      <div className="ab-ship-line ab-rise">External delivery to Port C with 'Package'</div>
    </div>
  );
  return (
    <div className="scene-pad ab-scene ab-summary-scene">
      <div className="ab-summary-line ab-rise">ABC 把「忘了实现接口」<b>提前到实例化期暴露</b></div>
    </div>
  );
}
