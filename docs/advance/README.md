## Cellink 进阶

面向熟练使用者，Cellink 提供了一些高级特性。



### 量子节点

借用了量子力学的术语。Cellink 允许开发者构建所谓的“量子节点”。下图中的 Square 节点就是一个量子节点：

```python
class A(NodeSI):
    def forward(self):
        self.val = 12
        return True

class B(NodeSI):
    def forward(self):
        self.val = 2
        return True


@hook_parent([A, B])
class Square(NodeSI):
    def forward(self):
        val = self.parent.val
        self.val = val * val
        return True
```

表面上看，Square 节点与普通节点并无不同，但 Square 节点的“两个父节点”被放在方括号里。

这样的挂载方式在 Square 节点看来只挂载了一个父节点，但自己变成了两个分身。我们称 Square 节点处于**量子态**，它的量子态数量为 2 。

*量子节点本质上是共享一个节点名称和类定义的多个节点的集合。*

*某种意义上说，普通节点也是量子节点，它们的量子态数量为 1 。*



#### @hook_parent 的拓展

在更详细说明量子态之前，请允许我先介绍 @hook_parent 装饰器的拓展特性。

@hook_parent 装饰器完整的输入格式是：

```python
@hook_parent([(Node1, id1), (Node2, id2), ...], ...)
```

@hook_parent 装饰器的每个入参（Argument）代表一个父节点。它可以是一个节点类，或者 tuple 类型，或者节点类和 tuple 类型的混合列表（list）。这三种形式对挂载它的量子节点来说都是一个父节点。

其中 tuple 类型表示“坍缩”操作，用于析取量子节点的量子态。它的第一个元素为节点类，第二个元素为非负整数，表示所析取的第几个量子态：

```python
@hook_parent((Node, 0)) # 析取 Node 的第一个量子态作为父节点
@hook_parent((Node, 1)) # 析取 Node 的第二个量子态作为父节点
```

普通的挂载方式只是参数格式上的简化：

```python
# 假设 Node1 和 Node2 的量子态数量都为 1，即普通节点
# 以下两个表达式完全等价
@hook_parent(Node1, Node2, ...)
@hook_parent([(Node1, 0)], [(Node2, 0)])
```

@hook_parent 装饰器也支持混合格式：

```python
@hook_parent(Node1, (Node2, 1))
@hook_parent([Node1, (Node2, 2), Node3]， Node4)
```

@hook_parent 装饰器接收参数时的原则只有一个：所有父节点的量子态数量须保持一致。

这样做是为了保持父节点量子态之间的对应关系。因为子节点的量子态须和父节点的量子态一一对应。

假设一个多输入节点有两个父节点 Node1 和 Node2，那么一般来说 Node1 的量子态必须和 Node2 的相等。

然而也有例外。 @hook_parent 支持类似 numpy 里的 dimension broadcasting 。量子态为 1 的父节点会自动扩展自己的量子态，与其它父节点的量子态数量保持一致：

``` python
# 假设 Node1/2/3 都是量子态为 1 的普通节点
# 那以下输入格式也是合法的，因为 Node1 会自动扩展成 [Node1, Node1] 与 [Node2, Node3] 保持一致
@hook_parent(Node1, [Node2, Node3])

# 因为量子态的一一对应关系，上一条语句的效果类似于两个多输入类型的子节点挂载不同的父节点组合
@hook_parent(Node1, Node2) # 第一个量子态的等效
@hook_parent(Node1, Node3) # 第二个量子态的等效
```



#### 量子节点的特性

子节点的量子态数量和父节点的量子态数量相等。

在有量子节点的图中，traverse 方法只遍历所有节点的第一个量子态。

运行 seek 方法时，Cellink 会根据目标节点的量子态，选择其它节点相对应的量子态运行。

seek 量子节点的结果等效于 seek 该节点的第一个量子态。想要 seek 其它量子态，需要创建新节点并在 @hook_parent 装饰器里“坍缩”到想要的量子态：

```python
# 接之前的代码
@hook_parent((Square, 1))
class BSquare(NodeSI):
    def forward(self):
        self.val = self.parent.val
        return True

if __name__ == '__main__':
    node = A()
    node = node.seek('BSquare')
    print(node.val)
```

以上代码展示了如何从量子节点“坍缩”到普通节点。@hook_parent((Square, 1)) 表示挂载量子节点 Square 的第二个量子态，即和节点 B 对应的量子态。

输出结果是 4 。

下图是上面两段代码的流程视图：

![](assets/imgs/quantum-graph.png)
