## 基本概念介绍

### 一、节点

“节点”是 Cellink 的基本类型。为了简单起见，我们没设计其它类型。因此，**节点类型是 Cellink 里的唯一类型**。Cellink 的所有功能，都通过节点的方法实现。

根据不同的输入类型，Cellink 提供了 3 种节点的基类：

```python
class NodeSI # 单输入节点（Single Input）
class NodeMI # 多输入节点（Multiple Inputs）
class NodeCI # 条件輸入节点（Conditional Inputs）
```

下图是这 3 种节点的可视化结构展示：

![三种节点结构](/imgs/node-types.png)

- **NodeSI**：只有一个父节点
- **NodeMI**：挂载一个或多个父节点
- **NodeCI**：和 NodeMI 类似，挂载多个父节点。区别在于，执行 NodeMI 的条件是所有父节点都能执行；而 NodeCI 只要任一父节点能执行就行



#### 创建节点

Cellink 通过继承节点类来创建新节点。下代码展示如何创建一个 NodeSI 节点：

```python
from cellink import NodeMI

class Diff(NodeMI):
    def __str__(self):
        return 'diff'
```



#### 访问父节点

子节点可以通过类变量来访问父节点：

- **parent**：NodeSI 类型的父节点
- **parent_list**：NodeMI 和 NodeCI 类型的父节点列表（之所以不叫 parents 是怕拼写上容易与 parent 混淆）

父节点列表 parent_list 还有以下两点特性：

1. 父节点在 parent_list 中的次序与被挂载时的次序相同。有关父节点的挂载，下个章节会介绍
2. 如果 NodeCI 的某个父节点无法执行，那么对应 parent_list 元素的值为 None



#### 根节点

没有任何父节点的节点叫根节点。一个项目里可以有多个根节点。

根节点可选择继承 NodeSI/NodeMI/NodeCI 中的任何一个，Cellink 不做限制。

根节点一般是整个项目的数据入口。我们发现，用类方法（@classmethod）实例化根节点是比较好的实践：

```python
class Root(NodeSI):
    @classmethod
    def initialize(cls, val):
        root = cls()
        root.val = val
        return root

root = Root.initialize(42)
```



### 二、图

“图”由节点组成。子节点用装饰器 ``@hook_parent`` 挂载父节点。Cellink 的内部机制确保了图的有向无环结构。

下面代码展示了如何用 3 个节点搭建一个简单的图：

```python
from cellink import NodeSI
from cellink import NodeMI
from cellink import hook_parent

class RGB(NodeSI): # 此为根节点（没有父节点），可继承任何节点类型
    @classmethod
    def from_image_path(cls, image_path):
        att = cls()
        att.img = cv2.imread(image_path)
        return att

@hook_parent(RGB)
class Gray(NodeSI):
    def __str__(self):
        return 'gray'

    def forward(self):
        rgb_img = self.parent.img  # 通过 self.parent 访问父节点
        self.img = rgb2gray(rgb_img)
        return True

@hook_parent(RGB, Gray)
class Diff(NodeMI):
    def __str__(self):
        return 'diff'

    def forward(self):
        rgb_img  = self.parent_list[0].img  # 访问父节点 RGB
        gray_img = self.parent_list[1].img  # 访问父节点 Gray
        self.img = np.abs(rgb_img.astype('float32') - gray_img[:,:,None])
        return True
```

上面代码由 Cellink 绘制的流程视图如下：

![](/imgs/demo-graph.png)

**当一个节点被实例化时，图中的所有其它节点都会被实例化，于是它所在的图也完成了实例化：**

```python
rgb = RGB() # 此时其它两个节点的实例也会随着被实例化
rgb.draw_graph() # 节点被实例化时，图也跟着被实例化
```



## 创建节点

新节点在创建时需要继承三个节点类（NodeSI/NodeMI/NodeCI）中的一个，并重载以下 3 个方法：

1. **\_\_str\_\_**：创建节点名称。可缺省

2. **forward**：前向处理方法。可缺省

3. **backward**：反向处理方法。可缺省

我们一一展开介绍。



### 1. 节点名称 \_\_str\_\_：

节点的名称通过重载 \_\_str\_\_ 方法定义。如缺省，则以类名代替：

```python
class Rocket(NodeSI):
    def __str__(self):
        return 'rocket'
```

注：发现重名节点 Cellink 会报错。



### 2. 前向处理 forward：

Cellink 能推动从根节点出发，正向传播的业务流。沿途节点的 forward 方法会被依次调用。

forward 方法承载当前节点的业务逻辑。通常需要访问并处理父节点的数据，生成自己的数据。

forward 方法返回一个 boolean 值，通知 Cellink 后台是否执行成功。

forward 方法在缺省时返回 False（根节点返回 True，因为根节点的变量一般在类方法里设置）。

虽然 Cellink 不做限制，我们也不建议开发者在 forward 方法中修改父节点的内容。

Cellink 假定了 forward 方法的业务逻辑很耗时，且在输入数据固定的情况下输出结果不变（没有随机因素）。

**所以 forward 方法在节点的整个生命周期里只执行一次！！！**

**所以 forward 方法在节点的整个生命周期里只执行一次！！！**

**所以 forward 方法在节点的整个生命周期里只执行一次！！！**

这种设计保证了节点中的业务代码不会被重复运行。

以下是 forward 方法的一个示例：

```python
@hook_parent(RGB, Gray)
class Diff(NodeMI):
    def forward(self):
        # 获取父节点的数据
        rgb_img  = self.parent_list[0].img
        gray_img = self.parent_list[1].img
        # 生成自己的数据
        self.img = np.abs(rgb_img.astype('float32') - gray_img[:,:,None])
        # 返回 True 告知后台执行成功
        return True
```



### 3. 反向处理 backward：

Cellink 能推动从当前点出发，反向传播的业务流。沿途节点的 backward 方法会被依次调用。

和 forward 方法一样，backward 方法也返回一个 boolean 值，用于通知 Cellink 后台是否执行成功。

backward 方法缺省时默认返回 False 。

backward 方法比较常见的业务逻辑是对父节点数据进行修改。

backward 方法在机器视觉领域很有帮助。在我们的项目实践中，backward 方法通常用于反向传播检测结果的坐标。因为坐标变换只需在相邻层级的坐标系上进行，极大简化了编程的复杂度。

如果没有将信息反向传播的业务需求，backward 方法可以缺省。

以下是 backward 方法的一个示例：

```python
class ScaleAndTranslate(NodeMI):
    def backward(self):
        scale = self.scale 
        x0, y0 = self.offset
        x, y = self.coordinate
        # 从局部坐标变换到全局坐标
        self.parent.coordinate = (x / scale + x0, y / scale + y0)
        self.parent.classname = self.classname
        return True
```



## 使用 Cellink

Cellink 支持几种简单的图操作（如遍历，广播，和路径搜索等等）。这些操作都通过调用节点中的方法/变量实现。



### 前向搜索 seek：

从所有根节点开始，seek 方法遍历所有到目标节点的前向路径。沿途所有节点的 forward 方法会依次被执行。

seek 方法输入目标节点的名称（该名称通过 \_\_str\_\_ 方法定义），返回目标节点的实例：

```python
diff = rgb.seek('diff')  # 从根节点开始，依次执行沿路各节点的 forward() 方法，并返回 Diff 节点的实例
print(diff.img.shape)  # 因为 diff.forward() 已被执行，diff.img 也被生成
```

如果无法抵达目标节点（沿途的 forward 方法执行失败返回了 False，中断了正向传播的过程），seek 方法返回 None 。

seek 方法可以被任意节点调用，效果是一样的：

```python
node1 = rgb.seek('diff')
node2 = node1.seek('diff')
assert node1 == node2
```



### 反向搜索 retr：

从当前节点出发，retr 方法（retrospect，缩写成四个字母是为了和 seek 等长）遍历所有到目标节点的前向路径。沿途所有节点的 backward 方法会依次被执行：

```python
gray = root.seek('gray')
print(gray.bboxes) # 输出：[[33,100,94,423], [53,16,312,50]]

# 反向传播到根节点
root = gray.retr('rgb')
print(root.bboxes) # 输出某个值
```

如果无法抵达目标节点（沿途的 backward 方法执行失败，中断了反向传播的过程），retr 方法返回 None

retr 方法可以不输入参数，此时 retr 会从当前节点沿路运行所有祖先节点的 backward 方法。此时 retr 方法返回 None：

```python
gray.retr()
print(root.bboxes) # 输出某个值
```



### 索引：\_\_getitem\_\_()

该方法可以索引图中任一节点：

```python
diff = root['diff']
gray = diff['gray']
```

**注意**：和 seek 方法不同，索引操作不触发沿途的 forward 方法。



### 广播：broadcast()

broadcast 方法输入一个字典类型作为信息，并向所有节点广播。其它节点可通过 self.broadcasting （字典类型）读取：

```python
root.broadcast({'greet': 'good morning!'})
print(gray.broadcasting['greet'])  # 输出: good morning!
gray.broadcast({'greet': 'good evening!'})
print(root.broadcasting['greet'])  # 输出: good evening!

# 更直接的广播方法：
root.broadcasting['greet'] = 'good evening!'
print(gray.broadcasting['greet'])  # 输出: good evening!
```

广播机制用于节点间快速通信，类似全局变量。

不建议滥用广播机制。



### 遍历：traverse()

traverse 方法以 callback 函数为输入，该 callback 函数以节点实例为输入，由开发者定义。

traverse 遍历图中所有节点，并对以每个节点为输入执行 callback 函数。最后返回 callback 函数的执行结果列表：

```python
str_node_pairs = diff.traverse(lambda node: (str(node), node)) # 返回 callback 函数的输出列表
str2node = dict(str_node_pairs)
root = str2node['rgb']
```

traverse 方法不触发沿途的 forward/backward 方法。

traverse 方法遍历节点的次序是无规则的。



### 绘制流程视图：draw_graph()

draw_graph 方法绘制流程视图（见上图）。视图保存在工作目录的 ``graph.pdf`` 文件中。

**Cellink 需安装 graphviz 库（pip install graphviz）和相关工具。**graphviz 在不同系统下的安装说明请参见：[graphviz 下载页面](https://graphviz.org/download/)

```python
root.draw_graph() # 画出整个网络
```



## 装饰器说明

Cellink 定义了两种装饰器：``@hook_parent`` 和 ``@static_initializer`` 。前者用于挂载父节点，后者实现静态初始化功能。



### 挂载装饰器 @hook_parent

@hook_parent 是类装饰器，用于挂载父节点。@hook_parent 以父节点类作输入：

```python
@hook_parent(ParentClass) # 挂载一个父节点
class ChildClass(NodeSI): # 挂载一个父节点时，子节点可继承 NodeSI 类
    def forward(self):
        parent_node = self.parent
        ...

@hook_parent(MotherClass, FatherClass) # 挂载多个父节点
class ChildClass(NodeMI): # 挂载多个父节点时，子节点应该继承 NodeMI 类或 NodeCI 类
    def forward(self):
        mother_node = self.parent_list[0]  # parent_list 的实例类别次序和装饰器输入类别次序一致
        father_node = self.parent_list[1]  # parent_list 第二个元素是 FatherClass 的类实例
        ... 
```



### 静态初始化装饰器 @static_initializer：

@static_initializer 是函数装饰器，用于（静态）加载初始化耗时的内容。设计该装饰器是为了给运行加速 。

让我尝试用案例来说明。很多深度学习项目需要加载 AI 模型，加载模型通常比较耗时。普遍的做法是在初始化阶段一次性完成加载。哪怕某些模型没被用到，却也消耗了加载时间。我们希望 Cellink 能赋予更多灵活性：

1. 只有被 seek 方法触发，相关节点的模型才会被加载

2. 在程序的整个生命周期中，模型不会被重复加载

为了不失一般性，“模型加载”也可以是任何开销昂贵的初始化操作。

以下代码展示了 @static_initializer 的用法

```python
@hook_parent(Image)
class Bump(NodeSI):
    def __str__(self):
        return 'bump'

    @static_initializer
    def initialize_bump_finder(self):  # 该函数在整个进程生涯中只执行一次
        # 加载 AI 模型，耗时操作
        bump_finder = Controller(gpu_id=0)
        return bump_finder

    def forward(self):
        img = self.parent.img
        # 在程序的生命周期中，只有第一次调用会执行该函数的内容，
        # 往后的所有调用只返回第一次调用返回的内容
        bump_finder = self.initialize_bump_finder()
        bump_bboxes = bump_finder(img)

img1 = Image.from_image_path('IMAGE1.JPG')
bump = img1.seek('bump')  # 加载 AI 模型，耗时 2s

img2 = Image.from_image_path('IMAGE1.JPG')
bump = img2.seek('bump')  # AI 模型不会被二次加载，只执行业务代码
```

@static_initializer 装饰器保证被装饰函数在整个进程周期中只调用一次，往后的调用都只是返回第一次加载进来的模型的引用。


