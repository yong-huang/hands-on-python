import type { Narration } from "../../registry/types";
export const narrations: Narration[] = [
  "ABC 提供类型约束：@abstractmethod 强制子类实现接口。类里还有非抽象的默认实现，所有子类共享。",
  "真机：Transport() 直接 TypeError——因为有未实现的抽象方法。失败点提前到实例化时。",
  "register() 把第三方类纳入继承体系。不继承也能过 isinstance 和 issubclass。",
  "真机 Ship：External delivery to Port C——第三方类也能走 transport 管道。",
  "ABC 把「忘了实现接口」从运行期调用提前到实例化期暴露。",
];
