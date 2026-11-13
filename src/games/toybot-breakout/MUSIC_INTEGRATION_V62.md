# V62 授权配乐接入

用户确认：普通关柔和、首领战更厚重；基于已试听候选接入并提交Git。

## 曲目与授权

使用3个CC0衍生剪辑母带，并非6首新原创曲：

- road-soft-v62.mp3：Wolfgang_《Battle Theme》，普通关/首页；https://opengameart.org/node/16611
- guardian-heavy-v62.mp3：Cleyton Kauffman《Boss Battle Theme》，首领1/3/5；https://opengameart.org/content/boss-battle-theme
- guardian-orchestra-v62.mp3：MintoDog《Hope》，首领2/4；https://opengameart.org/content/hopeorchestral-battle-music

原页面标注CC0 1.0：https://creativecommons.org/publicdomain/zero/1.0/ 。保留作者署名与来源。原曲、SHA256、处理参数位于art-source/music-v62与music-licensed-v62.json，不进入部署包。编辑为选段、均衡、响度、240ms循环交叠及Hope的0.9倍变速；没有宣称重新创作旋律或录制乐器。

## 播放规则

- musicTracks.ts使用显式秒数：普通60秒、厚重64秒、管弦60秒，循环从0秒开始，不套用旧BPM/小节。未知BPM记0，播放只使用实测秒数。
- 普通→首领、首领→首页切换约0.65秒互补线性交叉淡化，新曲解码完成后旧曲才淡出，避免下载时留白；首领登场→战斗→二阶段维持同一实例。
- 暂停/剧情/后台/静音续用现有暂停与位置恢复；胜利/战败/结算停止BGM，保留结算提示音；新runId重播，卸载清理音源。音乐音量仍独立于音效。
- 三个版本化URL避免旧缓存继续播放电子曲。旧6首移至art-source/retired-music-v62，历史作曲器使用该目录tracks.ts重制历史曲，不会把旧URL带入当前部署或资源审计。

## 验证

409项战斗/存档/音乐/发布/语言回归通过。TypeScript与相关ESLint通过；122个当前素材URL缺失0。新增原曲与母带SHA校验、显式循环长度、交叉淡化、暂停/继续与胜利停播测试。

浏览器实际音频验收与最终ZIP校验报告保存在V62交付目录，以交付报告为准。测试脚本只在工作区，通过真实createGameAudio/musicSceneFor模块驱动播放，不进入游戏包。未进行Facebook与真机扬声器验收。

浏览器实测：三份MP3按六场景解码，时长60/64秒，峰值0.411—0.586，循环边界修复后采样差0。实际createGameAudio音乐引擎+musicSceneFor状态：普通播放→首领登场→战斗不重启（21.36→40.36秒），暂停41.3893秒、恢复41.5493秒；首领管弦切换、胜利停播、返回首页、runId重开0.152秒均通过。此为真实浏览器音频模块验收，不冒充真机或Facebook平台验收，也不把数值检查当成真人主观听感。
