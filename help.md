怎麼用 Music Code Player
===
Music Code Player 是個網頁程式，可以讓你只用純文字就打出音樂。

要播放音樂，你要使用 MML 語法描述音樂

MML 語法
---
MML 是 Music Macro Language 的縮寫。本程式使用的 MML 語法不分大小寫，所以說 `A4` 和 `a4` 是同樣的意思
<table>
<tr>
  <th>代碼</th><th>說明</th>
</tr>
<tr>
  <td>CDEFGAB</td>
  <td>
<p>音符，格式為 <code>音高 升降號 長度 附點 連接線符號</code>。
音高是 A ~ G 中的一個字母，<code>C</code> 是 Do，<code>D</code> 是 Re，<code>E</code> 是 Mi，以此類推。</p>

<p>升降號是 0 或多個 <code>+</code>、<code>#</code>、<code>-</code> 或 <code>=</code>。<code>+</code> 和 <code>#</code> 是升記號，<code>-</code> 是降記號，<code>=</code> 是還原記號。</p>

<p>長度是個正整數，如 <code>4</code> 代表四分音符。可選擇性增加1個附點，效果和附點音符一樣，是延長至原本長度的 3/2。</p>

<p>連接線符號是 <code>~</code>，可用來連接下一個同樣音高的音符。</p>

<p>以上的各部分，除了音高外都可以省略。而且各部分可用空格分隔，也可以完全不分隔。

<p>如 <code>A + 2 .</code> 和 <code>A+2.</code> 都表示升A (La) 附點二分音符
  </td>
</tr>
<tr>
  <td>P 或 R</td>
  <td>
休止符，和音符的格式很相似，但沒有音高、升降號，也沒有連接線。如 <code>P 4</code> 和 <code>R4</code> 都表示四分休止符
</tr>
<tr>
  <td>O</td>
  <td>
指定八度，後面的數字表示接下來的音符在哪個八度。 <code>O4</code> 是涵蓋中央Do的八度範圍。數字越大，音高越高。
  </td>
</tr>
</table>
