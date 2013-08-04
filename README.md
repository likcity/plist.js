##这是一个纯JS写的解析Apple Plist格式的工具
This is a JS tool to parse BOTH Binary & XML format Plist files

### 欢迎大家贡献代码, 我不太会写JS

### 用法


`<script type="text/javascript" src="plist.js"></script>`

```
//f参数为File对象
getPlist(f,function(obj){
          console.log(obj);
});


```


### TODO

1. 测试Data类型
2. 在Chrome, Firefox测试
3. 支持XML格式plist

----

Apple Plist格式 有2种: XML格式 和 二进制格式(bplist, Binary Plist). 搜了一下没有太官方的文档说明二进制格式的描述,只有在苹果开源代码文件的注释里头[提到](http://opensource.apple.com/source/CF/CF-550/CFBinaryPList.c), 我仔细研究了一下,也参考了[Node.js代码](https://gist.github.com/clee/1007217)和[Python代码](https://github.com/farcaller/bplist-python/blob/master/bplist.py)中的解析过程,把具体格式做下说明,如果有不对的请*立即指正*以免误导大家.

### 文件结构
注: T,K,L,M,N在文件尾的解释中有说明
	
文件头 | 对象表 | 偏移表 | 文件尾  
--- | --- | --- | ---
开头8字节 | 8~K字节 | K+L*N字节 | 最后32字节


###文件头 (文件开始的8字节)

字段 | 长度 | 说明
--- | ---- |----
格式 | 6|	定值:`62 70 6C 69 73 74`   表示: "bplist"
版本 | 2|	定值:`30 30` 				表示:"00"

所以固定为 `62 70 6C 69 73 74 30 30`    

###文件尾 (文件最后的32字节)

字段 | 长度 | 说明
--- | ---- |----
空 	| 6		| 备用
L |1| 偏移表中的整形字节长度 
M |1| 对象表中表示整数的字节长度	
N |8| 偏移表的元素个数 
T |8| 根节点在偏移表中的位置 
K |8| 偏移表在文件中的偏移量

``` 
举例,这是文件的最后32个字节: 
00 00 00 00 00 00 02 01   
00 00 00 00 00 00 00 45   
00 00 00 00 00 00 00 00  
00 00 00 00 00 00 03 EE 

L = 0x02 =2  
M = 0x01 =1  
N = 0x00 00 00 00 00 00 00 45 = 69
T = 0x00 00 00 00 00 00 00 00 = 0
K = 0x00 00 00 00 00 00 03 EE = 1006

说明 偏移表是从文件第1006个字节开始的, 共有69个元素,每个元素占2个字节, 其中第0个元素是根节点的偏移位置.

```
  

###偏移表 (文件从K开始的L*N字节)
    偏移表中有N个元素,每个元素是占L个字节的整数,每个元素表示其对应的对象在文件中的偏移位置
```
举例, 根据上面的文件尾 我们找出了偏移表:
00 08 00 47 00 54 00 5C 
00 66 00 71 00 8D 00 9F 
00 B5 00 C8 00 D7 00 F4 
01 0A 01 27 01 47 01 66 
01 7B 01 86 01 99 01 AE 
01 C2 01 D6 01 EA 01 F8 
02 0D 02 30 02 46 02 5A 
02 7A 02 8C 02 99 02 A8 
02 AE 02 B3 02 BF 02 C6 
02 C9 02 CF 02 D7 02 F5 
02 FE 03 03 03 05 03 0E 
03 12 03 14 03 1A 03 20 
03 45 03 49 03 5B 03 5C 
03 5F 03 68 03 74 03 77 
03 8D 03 92 03 95 03 96 
03 97 03 99 03 BA 03 C0 
03 C5 03 DB 03 E2 03 EA 
03 EC

2个字节(L)表示一个元素 共得到69个10进制整数元素:
  8,  71,  84,  92, 102, 113, 141, 159, 
181, 200, 215, 244, 266, 295, 327, 358, 
379, 390, 409, 430, 450, 470, 490, 504, 
525, 560, 582, 602, 634, 652, 665, 680, 
686, 691, 703, 710, 713, 719, 727, 757, 
766, 771, 773, 782, 786, 788, 794, 800, 
837, 841, 859, 860, 863, 872, 884, 887, 
909, 914, 917, 918, 919, 921, 954, 960, 
965, 987, 994,1002,1004

根节点的位置T=0 取第0个元素为8 则表示根节点是从文件第8个字节开始的
```
	
	
###对象表 (文件中8到K的字节)

类型		| HEX	| 说明
------ 	| :---:	| ---
单字节	| 0X	| X=0:空值 X=8:布尔假 X=9:布尔真
整数		| 1X	| 后面跟的2^X个字节就是这个数字的值
浮点数	| 2X	| 后面跟的2^X个字节就是这个数字的值
日期		| 33	| 后面接着8个字节的浮点数时间戳
二进制	| 4X	| X表示这段数据的字节数
字符串	| 5X	| ASCII编码 X表示这段数据的字节数,如果X=F则后面作为整数对象继续解析所得数既为字节数
字符串	| 6X	| Unicode编码 X表示这段数据的字节数,如果X=F则后面作为整数对象继续解析所得数既为字节数 记得双字节!
UID		| 8X	| X+1表示这段数据的字节数
数组		| AX	| X表示其元素个数,如果X=F则后面作为整数对象继续解析所得数既为个数 后面接着X个元素在偏移表的位置
集合		| CX	| X表示其元素个数,如果X=F则后面作为整数对象继续解析所得数既为个数 后面接着X个元素在偏移表的位置
字典		| DX	| X表示其元素个数,如果X=F则后面作为整数对象继续解析所得数既为个数 后面接着X个key在偏移表的位置,X个value在偏移表的位置

```
举例, 刚才找到了根节点的位置是8,开始递归的把对象全部找出来:
DF 10 1E 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E …

第一步: 第一个字节 是数据类型 0xDF, 为`DX`格式 说明是字典类型,而X=0xF,所以要从后面去M(这里是1)位0x10,而0x10表示的是整数,此整数的字节数2^0=1表示后面的1个字节0x1E就是这个字典的元素个数,既此字典有30个键值对.  
第二步: 在`1E`后面跟的30个字节代码key在偏移表中的索引位置, 再后面30个字节是value的索引位置
第三步: 分别递归找出每个key/vaule对应的对象 组成了这个字典

-----------
再来一个: 
D1 01 02 
key[0]=01, 表示偏移表01指向它的值
val[0]=02, 表示偏移表02指向它的值

01给出了偏移量是11 我们从文件11个字节开始找到了此对象
5A 4D 69 6E 64 52 65 61 64 65 72 D5 03 04 05 06 ...

0x5A 说明这是个ASCII字符串. A表示长度为10个字节: 4D 69 6E 64 52 65 61 64 65 72 这在ASCII编码中代表的是:"MindReader" 所以我们得到了key是MindReader 剩下的value也用类似的方法可以得到了,哎0xD5 又是一个嵌套的字典... 

```