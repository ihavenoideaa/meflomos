marked.setOptions({
    breaks: true // 将 \n 解析为 <br>
});

let avatar,user_nickname,user_name;
let all_memos = [];
let isTagFiltering = false;
let lastFilter;
let nowFilterTag = '';
let beginIndex = 0;
const loadLength = 20; // 每次加载条数
let timeList =[];
let memosTotal = 0;
const memosStats = {};
let tagTotal = 0;
tagData = {};
const tagStats = {};

document.addEventListener('DOMContentLoaded', async () => { // DOM 加载后执行
    let page_token = '';
    let host_url = '';
    ({avatar, user_nickname, user_name} = await renderUserDisplay());

    host_url = `${memosHost}/api/v1/memos?pageSize=50&pageToken=`

    // 初次获取数据 intiLoad()
    const intiLoad = async () => {
        try {
            const response = await fetch(host_url);
            const { memos, nextPageToken } = await response.json(); //获取memos和nextPageToken
            all_memos = memos;
            page_token = nextPageToken;

            while(page_token != '') {
                let token_url = host_url + page_token;
                try {
                    const response = await fetch(token_url);
                    const { memos, nextPageToken } = await response.json();
                    all_memos = [...all_memos, ...memos]; // 追加预加载的数据
                    page_token = nextPageToken;
                } catch (error) {
                    console.error('加载失败:', error);
                }
            }
            handleMemosData();
            document.getElementById('memos_container').innerHTML = '';
            renderMemos();

            renderSideBar();

            initTheme();
        } catch (error) {
            console.error('数据加载失败:', error);
        }
    };
    
    // 渲染动态列表
    const renderMemos = () => {
        if (beginIndex < memosTotal)  {
            const begin = beginIndex;
            const end = beginIndex + loadLength  ;
            if (end > all_memos.length) {
                end = all_memos.length;
            }

            beginIndex = end;
            const sliceData = all_memos.slice(begin, end);
            renderMemosCard(sliceData);
        }
    }
    
    // 滚动加载逻辑
    const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        if (!isTagFiltering && scrollTop + clientHeight >= scrollHeight - 100) { // 滚动到底部
            renderMemos(); // 加载下一页
        }
    };
    
    // 监听滚动事件（防抖处理）
    window.addEventListener('scroll', Debounce(handleScroll, 100));

    intiLoad();
});

function renderMemosCard(renderMemos) {
    const container = document.getElementById('memos_container');
    container.innerHTML = ''; // 清空容器
    renderMemos.forEach((memo, index) => {
        const tagsString = memo.tags.join(' ');
        const item = document.createElement('div');
        item.className = `memos-card relative flex flex-col justify-start items-start w-full p-[18px] mb-2.5 gap-2 bg-white dark:bg-[#202020] rounded-lg border border-white dark:border-zinc-800 hover:border-gray-200 dark:hover:border-zinc-700 animated wow`;
        item.setAttribute('data-tags', tagsString);
        item.setAttribute('data-wow-delay', `0.${index}s`);
        item.setAttribute('data-cid', memo.creator);
        item.innerHTML = `
            ${renderHeader(memo, avatar, user_nickname, user_name)}
            ${renderContent(memo)}
        `;
        container.appendChild(item); // 追加新数据
    });
}

// 渲染页面顶部用户信息
async function renderUserDisplay() {
    const url = `${memosHost}/api/v1/${memosUserId}`;
    console.log(url)
    try {
        const response = await fetch(url);
        const data = await response.json();

        const avatar = `${memosHost}${data.avatarUrl}`;
        console.log(avatar)
        const user_name = data ? data.username : "Memos";
        const description = data ? data.description : "memos";
        const user_nickname = data&&data.nickname!=="" ? data.nickname : user_name;

        const userDisplay = document.getElementById('user_display');
        userDisplay.innerHTML=`
            <div class="w-8 h-8 overflow-clip !w-16 !h-16 drop-shadow rounded-3xl">
                <img class="user_avatr w-full h-auto shadow min-w-full min-h-full object-cover dark:opacity-80 avatar lazyload" data-src="${avatar}" src="../lazyload_avatar.svg"/>
            </div>
            <div class="mt-2 w-auto max-w-[calc(100%-6rem)] flex flex-col justify-center items-start">
                <p class="user_name w-full text-3xl text-black leading-tight font-medium opacity-80 dark:text-gray-200">
                    ${user_name}
                </p>
                <p class="user_description w-full text-base text-gray-800 leading-snug dark:text-gray-400 line-clamp-6">
                    ${description}
                </p>
            </div>`;
        return {avatar, user_nickname, user_name};
    } catch (error) {
        console.error('数据加载失败:', error);
    }
}

// 渲染卡片上方用户数据
function renderHeader(memo, avatar, user_nickname, user_name) {
    const user = `
        <div class="w-full flex flex-row justify-between items-center gap-[10px]">
            <div class="w-auto max-w-[calc(100%-8rem)] grow flex flex-row justify-start items-center">
                <div class="w-full flex flex-row justify-start items-center">
                    <a class="w-auto hover:opacity-80" href="${memosHost}/u/${user_name}">
                        <div class="w-8 h-8 overflow-clip rounded-xl mr-2 shrink-0">
                            <img class="w-full h-auto shadow min-w-full min-h-full object-cover dark:opacity-80 lazyload" data-src="./assets/lazyload_img.gif" src="../lazyload_avatar.svg"/>
                        </div>
                    </a>
                    <div class="w-full flex flex-col justify-center items-start gap-[2px]">
                        <a class="w-full block leading-tight hover:opacity-80 truncate text-gray-600 dark:text-gray-400" href="${memosHost}/u/${user_name}">${user_nickname}</a>
                        <div class="w-auto -mt-0.5 text-xs leading-tight text-gray-400 dark:text-gray-500 select-none cursor-pointer">
                            <div>${formatDate(memo.displayTime, true)}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="group flex flex-row justify-end items-center select-none shrink-0 gap-2">
                <a class="flex flex-row justify-start items-center hover:opacity-70 group-hover:visible invisible" href="${memosHost}/${memo.name}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-earth w-4 h-auto text-gray-500 dark:text-gray-400"><path d="M21.54 15H17a2 2 0 0 0-2 2v4.54"></path><path d="M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17"></path><path d="M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05"></path><circle cx="12" cy="12" r="10"></circle></svg>
                </a>
                <div class="peer cursor-pointer">
                    <span class="flex justify-center items-center rounded-full hover:opacity-70 ml-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" class="lucide lucide-ellipsis-vertical w-4 h-4 mx-auto text-gray-500 dark:text-gray-400"><circle cx="7" cy="12" r="1"/><circle cx="12.5" cy="12" r="1"/><circle cx="18" cy="12" r="1"/></g></svg>
                    </span>
                </div>
            </div>
        </div>
    `;
    return user;
}
// 渲染卡片内容
function renderContent(memo) {
    //const memoContREG = marked.parse(memo.content);

    let TAG_REG = /(^|\s)#([^\s#]+)(?=\s|$)/g;
    let HTML_REG = /```__html([\s\S]*?)```/gm;
    var memoContREG = memo.content.replace(TAG_REG, 
        "<span><a class='memos-tag cursor-pointer' rel='noopener noreferrer' href='"
            + memosHost +"/explore?filter=tagSearch:$2' target='_blank' rel='noopener noreferrer'>#$2</a></span>")
        .replace(HTML_REG, "$1");   //匹配```__html```
        memoContREG = marked.parse(memoContREG);
    
    const content = `
        <div class="w-full flex flex-col justify-start items-start gap-2">
            <div class="w-full flex flex-col justify-start items-start text-gray-800 dark:text-gray-400 ">
                <div class="relative w-full max-w-full word-break text-[14px] leading-[1.8] space-y-2">
                    <div class="memos_content">
                        ${memoContREG}
                    </div>
                </div>
            </div>
            ${renderImages(memo)}
            ${renderFooter(memo)}
        </div>`;
    return content;
}

// 卡片图片
function renderImages(memo) {
    let resContent = '';
    if (memo.resources?.length) {
        resContent = '<div class="max-w-full flex flex-row justify-start items-start overflow-hidden hide-scrollbar">';
        resContent += memo.resources.map(res => {
            if (res.type.startsWith('image/')) {
                let res_url = `${memosHost}/file/${res.name}/${res.filename}`;
                return `<img class="res_img lazyload" data-fancybox="Joe" href="${res_url}" data-src="${res_url}?thumbnail=true" alt="${res.filename}" 
                        src="${lazyThumbnail}" onerror="Joe.errorImg(this, 'LoadFailedImg')">`;
            }
            if (res.type.startsWith('video/')) {
                return `<joe-dplayer height="150px" width="300px" src="${memosHost}/file/${res.name}/${res.filename}"></joe-dplayer>`;
            }
            return '';
        }).join('');
        resContent += '</div>';
    }
    return resContent;
}

// 渲染卡片底部
function renderFooter(memo) {
    let reaContent = '';
    const memoReactions = memo.reactions;
    const typeCountMap = new Map();
    for (const item of memoReactions) {
        const type = item.reactionType;
        typeCountMap.set(type, (typeCountMap.get(type) || 0) + 1);
    }
    if(typeCountMap.size > 0) {
        reaContent = '<div class="w-full flex flex-row justify-start items-start flex-wrap gap-1 select-none">';
        for (const [type, count] of typeCountMap) {
            reaContent += `
            <div class="mt-px h-7 border px-2 py-0.5 rounded-full flex flex-row justify-center items-center gap-1 dark:border-zinc-700 text-sm text-gray-600 dark:text-gray-400 cursor-pointer bg-blue-100 border-blue-200 dark:bg-zinc-900">
                <span>${type}</span>
                <span class="opacity-60">${count}</span>
            </div>`;
        }
        reaContent += '</div>'
    }
    return reaContent;
}

// 侧边栏
async function renderSideBar() {

    try {
        // 数据
        showNumberDate(memosStats);
        // 热力图
        createHeatmap(timeList);
        // 特殊类型
        handleXtype(tagStats);
        // 标签 tags
        handleAllTags(tagMap);

    } catch (error) {
        console.error('Error fetching post:', error);
        return null;
    }
  
}

function showNumberDate(data) {
    const timeDifference = new Date() - new Date('2025-03-15T18:03:07Z');
    const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    document.getElementById('memos-total').textContent = memosTotal;
    document.getElementById('tag-total').textContent = tagTotal;
    document.getElementById('day-count').textContent = daysDifference;
}

// 处理3个特殊类型的标签
function handleXtype(data) {
    const container = document.getElementById('memos-xtype');

    function createMemoElement(icon, text, filter, total) {
        const memo = document.createElement('div');
        memo.className = 'tag-filter statsTag w-auto border dark:border-zinc-800 pl-1.5 pr-2 py-0.5 rounded-md cursor-pointer';
        memo.setAttribute('data-filter', filter);
        memo.innerHTML = `
            <div class="w-auto flex justify-start items-center mr-1">${icon} </div>
            <span class="block text-sm mr-1"> ${text} </span>
            <span class="text-sm truncate"> ${total}</span>
        `;
        return memo;
    }

    const memoConfigs = [
        { icon: '✅', text: '待办', filter: 'isCode', total: `${data.taskTotal - data.incompleteTaskTotal}/${data.taskTotal}` },
        { icon: '🔗', text: '链接', filter: 'isLink', total: data.linkTotal },
        { icon: '💻', text: '代码', filter: 'isTask', total: data.codeTotal },
    ];

    memoConfigs.forEach(config => {
        const memo = createMemoElement(config.icon, config.text, config.filter, config.total);
        container.appendChild(memo);
    });
}

// 标签
function handleAllTags(tags) {
    const all_tags = document.getElementById('all-tags');
    for (const [tag, count] of Object.entries(tags)) {
        all_tags.innerHTML += `
            <a data-filter="${tag}" class="tag-filter cursor-pointer text-sm hover:underline focus:underline">#${tag}&nbsp;(${count})</a>
        `
    }
    handleTagFilter();
}
// 标签过滤
function handleTagFilter() {
    const tagFilters = document.querySelectorAll('.tag-filter');
    tagFilters.forEach(tagFilter => {
        tagFilter.addEventListener('click', function() {
            isTagFiltering = true;

            if(this.dataset.filter !== nowFilterTag) {
                nowFilterTag = this.dataset.filter;
                
                this.style.textDecoration = 'underline';

                if(lastFilter) {
                    lastFilter.style.removeProperty('text-decoration');
                }
                lastFilter = tagFilter;

                document.getElementById('memos_container').innerHTML = '';
                renderMemosCard(tagData[nowFilterTag]);
            }
            else {
                lastFilter.style.removeProperty('text-decoration');
                nowFilterTag = '';
                isTagFiltering = false;
                lastFilter = null;
                document.getElementById('memos_container').innerHTML = '';
                renderMemosCard(all_memos);
            }

            setTimeout(function () {
                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }, 300);
        });
    });

}

function createDay(date, post) {
    const day = document.createElement("div");

    day.className = "heatmap_day";

    day.addEventListener("mouseenter", function () {
        const tooltip = document.createElement("div");
        tooltip.className = "heatmap_tooltip";
        let tooltipContent = "";
        
        if (post) {
            tooltipContent += '<span class="heatmap_tooltip_post">'  + post + ' 条笔记于 ' + formatDate(date, false, 'yyyy-MM-dd') + '</span>';
        }

        tooltip.innerHTML = tooltipContent;
        day.appendChild(tooltip);
    });

    day.addEventListener("mouseleave", function () {
        const tooltip = day.querySelector(".heatmap_tooltip");
        if (tooltip) {
            day.removeChild(tooltip);
        }
    });

    if (post == 0 ) {
        day.classList.add("heatmap_day_level_0");
    } else if (post > 0 && post < 3) {
        day.classList.add("heatmap_day_level_1");
    } else if (post >= 3 && post < 6) {
        day.classList.add("heatmap_day_level_2");
    } else if (post >= 6 && post < 10) {
        day.classList.add("heatmap_day_level_3");
    } else {
        day.classList.add("heatmap_day_level_4");
    }

    return day;
}

function createWeek() {
    const week = document.createElement('div');
    week.className = 'heatmap_week';
    return week;
}

function createHeatmap(timelist) {
    const container = document.getElementById('heatmap');
    container.innerHTML = ''; // 清空容器

    const nowDate = new Date();
    const startDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() - 3 * 4 * 7 + 1); 

    let currentWeek = createWeek();
    container.appendChild(currentWeek);

    let currentDate = startDate;
    let i = 0;
    while (currentDate <= nowDate) {
        if (i % 7 === 0 && i !== 0) {
            currentWeek = createWeek();
            container.appendChild(currentWeek);
        }

        const sameDayCount = filterOlderDates(currentDate, timelist);
        if (sameDayCount) {
            const formattedDate = formatDate(currentDate);
            const day = createDay(formattedDate, sameDayCount);
            currentWeek.appendChild(day);
        } else {
            const formattedDate = formatDate(currentDate);
            const day = createDay(formattedDate, '0');
            currentWeek.appendChild(day);
        }

        i++;
        currentDate.setDate(currentDate.getDate() + 1);
    }
}

// 防抖函数
const Debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
};

// 时间格式化函数
const formatDate = (isoString, dateAgo = false, format = 'yyyy/MM/dd HH:mm:ss') => {
    const now = new Date();
    const date = new Date(isoString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    // 相对时间判断
    if(dateAgo) {
        if (diffInSeconds < 60) {
            return '刚刚';
        }
        else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} 分钟前`;
        }
        else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} 小时前`;
        }
        else if (diffInSeconds < 172800) { // 48 小时内
            return '昨天';
        }
        else if (diffInSeconds < 1296000) { // 15 天内
            const days = Math.floor(diffInSeconds / 86400);
            return `${days}天前`;
        }
    }

    // 超过一周显示具体时间
    return format.replace(/yyyy|MM|dd|HH|mm|ss/g, tag => ({
        yyyy: date.getFullYear(),
        MM: String(date.getMonth() + 1).padStart(2, '0'),
        dd: String(date.getDate()).padStart(2, '0'),
        HH: String(date.getHours()).padStart(2, '0'),
        mm: String(date.getMinutes()).padStart(2, '0'),
        ss: String(date.getSeconds()).padStart(2, '0')
    })[tag]);
};

function isSameDay(date1, date2) {
    const firstDate = new Date(date1);
    const secondDate = date2;
    return firstDate.getFullYear() === secondDate.getFullYear() &&
        firstDate.getMonth() === secondDate.getMonth() &&
        firstDate.getDate() === secondDate.getDate();
}

function filterOlderDates(targetDate, timeList) {
    let count = 0;
    let i = 0;
    for(let i = 0; i < timeList.length; i++) {
        const currentDate = timeList[i];
        if (new Date(currentDate) - targetDate < 0) { // 更早的日期
            timeList.splice(i, 1);
        }
        else if (isSameDay(currentDate, targetDate)) {  // 同一天
            timeList.splice(i, 1);
            count++;
        } else {
            break;
        }
    }
    return count;
}


function handleMemosData() {
    memosTotal = all_memos.length;
    memosStats["tagTotal"] = 0;

    tagData["isCode"] = [];
    tagData["isLink"] = [];
    tagData["isTask"] = [];
    tagData["isIncompleteTask"] = []; 

    tagStats["linkTotal"] = 0;
    tagStats["codeTotal"] = 0;
    tagStats["taskTotal"] = 0;
    tagStats["incompleteTaskTotal"] = 0;
    
    tagMap = new Map();

    all_memos.forEach(memo => {
        // 统计时间
        timeList.unshift(memo.createTime);

        memo.tags.forEach(tag => {
            tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
            // 统计标签数据
            if(!tagData[tag]) {
                tagData[tag] = [];
            }
            tagData[tag].push(memo);
        });

        // 统计类型数据
        if(memo.property.hasCode === true) {
            tagStats.codeTotal += 1;
            tagData.isCode.push(memo);
        }
        if(memo.property.hasLink === true) {
            tagStats.linkTotal += 1;
            tagData.isLink.push(memo);
        }
        if(memo.property.hasTaskList === true) {
            tagStats.taskTotal += 1;
            tagData.isTask.push(memo);
        }
        if(memo.property.hasIncompleteTasks === true) {
            tagStats.incompleteTaskTotal += 1;
            tagData.isIncompleteTask.push(memo);
        }
    });

    tagTotal = tagMap.size;
    const sortedEntries = [...tagMap.entries()].sort((a, b) => b[1] - a[1]);
    tagMap = Object.fromEntries(sortedEntries);
}


function initTheme() {

    const modeElement = document.querySelector('.action_item');
    const iconLight = document.querySelector('.mode-light');
    const iconDark = document.querySelector('.mode-dark');
    let localTheme = window.localStorage.getItem('data-mode');
    const htmlElement = document.documentElement;
    if(localTheme) {
        if (localTheme === "light") {
            htmlElement.setAttribute('data-mode', "light");
            iconLight.classList.remove('icon_active');
            iconDark.classList.add('icon_active');
        } else {
            htmlElement.setAttribute('data-mode', "dark");
            iconLight.classList.add('icon_active');
            iconDark.classList.remove('icon_active');
        }
    }
    
    if (modeElement) {
        modeElement.addEventListener('click', function (e) {
            e.stopPropagation();
            try {
                let localTheme = window.localStorage.getItem('data-mode');
                let theme = '';
                
                if (localTheme) {
                    // 切换主题模式
                    theme = localTheme === 'light' ? 'dark' : 'light';
                    if (localTheme === 'light') {
                        iconLight.classList.add('icon_active');
                        iconDark.classList.remove('icon_active');
                    } else {
                        iconLight.classList.remove('icon_active');
                        iconDark.classList.add('icon_active');
                    }
                } else {
                    theme = 'light';
                    iconLight.classList.remove('icon_active');
                    iconDark.classList.add('icon_active');
                    iconDark.style.backgroud = "url('../light_bg.png')"
                }

                const htmlElement = document.documentElement;
                htmlElement.setAttribute('data-mode', theme);
                window.localStorage.setItem('data-mode', theme);

            } catch (err) {
                console.log(err);
            }
        });
    }

}
