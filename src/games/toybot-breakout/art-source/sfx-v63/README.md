# V63 CC0音效母带

Kenney Sci-fi Sounds，CC0，https://kenney.nl/assets/sci-fi-sounds 。下载自作者OpenGameArt页面 https://opengameart.org/content/sci-fi-sounds ，许可原文KENNEY_LICENSE.txt。
qubodup竹棒风切录音，CC0，https://opengameart.org/content/swish-bamboo-stick-weapon-swhoshes 。对应源文件与SHA256见../../sfx-v63.json。

原音经过前导静音裁切、低通/高通、变速变调、机械/爆破层混合、峰值与RMS控制、淡入淡出。19个独立基音加升级/核心映射，共25类战斗事件。挥刀与命中独立，不改变伤害、射速或触发时点。当前atlas为单声道22050Hz16bit WAV，约358KiB，运行只解码一次。

重制命令：python build.py <实际仓库绝对目录>。读取本目录原件，生成游戏中的atlas和元数据；试听WAV在本目录生成且由.gitignore排除。需numpy及imageio-ffmpeg，仅开发制作使用，不加入游戏依赖。
