

## Cellink 实践

本小节介绍几个 Cellink 的编程实践。有些是有意设计的功能，有些是在使用过程中意外发现的特性。

“噢，原来我们可以如此这般 ......”，Cellink 有时会带给创造者惊喜。

我们也希望后来人能挖掘出更多奇妙。



### 实践一：用不同的图实例处理不同的数据

当一个节点被实例化时，它所在图中的所有其它节点都会被实例化。

实例化节点并不会执行业务逻辑，所以哪怕图中有上万个节点，实例化的计算开销也不足一提（相比真正的业务需求）。

前面提到，forward 方法在整个节点的生命周期中只会执行一次，因此节点的输出是固定的。如果要处理不同数据（比如另一张图片），我们建议实例化新的图来处理：

```python
# 实例化一个图，处理第一个数据
rgb1 = RGB.from_image_path('IMAGE1.JPG')
diff1 = rgb1.seek('diff')

# 实例化新图，处理第二个数据
rgb2 = RGB.from_image_path('IMAGE2.JPG')
diff2 = rgb2.seek('diff')
```



### 实践二：大胆托管你的实验代码

和业务无关的代码亦可放入图中作为节点托管（比如项目开发过程中的实验代码）。得益于 Cellink 对业务流的控制，这些非业务节点在正式的工作流程中永远不会执行。

当然如果你介意流程视图变得杂乱，可以选择定期清理一些非业务节点（注释掉它们的 @hook_parent 装饰器即可）。



### 实践三：重视中间结果的展示

直观的数据可视化对梳理业务逻辑很有帮助。可以为重要的节点实现 dump 或 show 方法，用于打印或可视化节点数据。甚至创建新的可视化节点来展示它们的内容。正如上面提到的那样，不要因此而担心影响运行速度（因为那不会发生）。



### 实践四：运用 Flag 节点

我们有时候会创建一些 Flag 节点来充当控制业务流的条件。比如某节点必须满足条件 A（比如说某个节点的变量大于 0 ）才能运行，那条件 A 就可以抽象成一个 Flag 节点：

``` python
@hook_parent(Number)
class FlagA(NodeSI): # 由条件 A 抽象出的节点
    def forward(self):
        return self.parent.val >= 0
    
@hook_parent(Number, FlagA)
class Sqrt(NodeMI):
	def forward(self):
        val = self.parent_list[0].val
        self.val = np.sqrt(val)
        return True
```

上面代码中，Sqrt 节点并没有访问 FlagA 的内容，而是利用 Cellink 的正向传播特性，把条件 A 变成自己运行的必要条件。

通常来说，条件 A 对业务很重要时我们才会把它抽象成 Flag 节点。这样做有利于业务逻辑的可视化（在流程视图上能直观反映）。

巧妙运用 NodeCI 节点还能实现其它基本逻辑（比如“异或”等）。



### 实践五：Worker 节点与 Neck 节点

worker 节点和 neck 节点来自项目实践，并非 Cellink 定义的特殊节点。本小节介绍如何借助这两种节点来实现检测任务。

- **worker 节点**：worker 节点都是叶子节点，名称以 'worker-' 开头。worker 节点通常是产生检测结果的节点，比如异常检测模块。worker 节点的检测结果通常在某 ROI 区域的局部坐标系。因此对外输出前，需要把局部坐标反向传播到根节点的全局坐标系上（见 backward 方法和 retr 方法）
- **neck 节点**：作为数据入口的根节点可以不直接面向各业务节点，而是通过一个 neck 节点代理数据分发。这样做的好处是方便 neck 节点在 backward 方法中收集反向传播回来的检测结果

下面代码展示了如何优雅地运行所有 worker 节点并收集它们的检测结果：

``` python
class InputNode(NodeSI):
    ...
    
@hook_parent(InputNode)
class Neck(NodeSI):
    ...
    def backward(self):
        if not hasattr(self.parent, 'results'):
            self.parent.results = self.results
        else:
            # 累积从不同 worker 节点反向传播回来的检测结果
            self.parent.results.extend(self.results)

# 运行所有 worker 节点，通过反向传播把检测结果累积到根节点
if __name__ == '__main__':
    root = InputNode.load_data(data)

    def _execute(node):
        if str(node).startswith('worker-') and node.seek(str(node)):
            node.retr()

    # 运行每一个 worker 节点并反向传播检测结果给根节点
    root.traverse(_execute)
    results = root.results
```



### 实践六：在节点中使用 Cellink

如果某个节点的业务很复杂，我们建议把它拆解成多个节点。但有时候这种拆解过于冗杂且与主业务无关（更不适合出现在流程视图上），我们就用子模块来封装该节点的业务。节点的子模块可以被另一个 Cellink 驱动，不同层级的 Cellink 不会相互干扰。

