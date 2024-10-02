const colors = require("colors");
const fs = require("fs");
const path = require("path");
const { parse } = require("querystring");

const taskID = [1001, 1002, 1003, 1004, 1005, 1006, 9002, 9003, 1099];
const scheduleId = [1001, 1101, 1201, 1301, 1302, 2001, 2002, 2003, 2004];

const rPath = (f) => path.join(__dirname, f);

const header = {
  Referer: "https://restaurant-v2.piggypiggy.io/",
  Origin: "https://restaurant-v2.piggypiggy.io",
  "Sec-Ch-Ua": `"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"`,
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": "Windows",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
};

const tokenMap = new Map();
const userName = new Map();

async function setToken(id, username, token) {
  let tokens = JSON.parse(fs.readFileSync(rPath("token.json"), "utf8") || "{}");

  tokens[id] = { token, username };

  fs.writeFileSync(rPath("token.json"), JSON.stringify(tokens, null, 4));
}

async function getToken(id) {
  const tokens = JSON.parse(
    fs.readFileSync(rPath("token.json"), "utf8") || "{}"
  );

  if (tokens[id]) {
    userName.set(id, tokens[id].username);
    return tokens[id];
  }

  return { token: "", username: "" };
}

async function login(id, name, payload) {
  const { token, username } = await getToken(id);
  try {
    const domain = "https://api.prod.piggypiggy.io/tgBot/login?";
    if (!token) {
      const res = await fetch(domain + payload, {
        method: "GET",
        headers: { Referer: "https://restaurant-v2.piggypiggy.io/" },
      });
      const parse = await res.json();
      if (parse.data?.token) {
        console.log(colors.green("Đăng nhập thành công"));
        tokenMap.set(id, parse.data.token);
        userName.set(id, name);
        await setToken(id, name, parse.data.token);
      } else {
        console.log(colors.red("Đăng nhập không thành công!"));
      }
      return;
    }
    console.log(colors.yellow("Có sẵn cache token"));
    tokenMap.set(id, token);
    userName.set(id, username);
  } catch (e) {
    console.log(e);
  }
}

async function GetAchievementInfo(id) {
  const domain = "https://api.prod.piggypiggy.io/game/GetAchievementInfo";
  const res = await fetch(domain, {
    method: "POST",
    headers: { ...header, Authorization: "bearer " + tokenMap.get(id) },
  });

  const d = await res.json();
  await addSchedule(id, d.data.mapInfo);
}

async function addSchedule(userId, info) {
  const domain = "https://api.prod.piggypiggy.io/game/AddSchedule";
  for await (const id of scheduleId) {
    const data = { Type: 2, Id: id, PlayerID: 0 };
    const res = await fetch(domain, {
      method: "POST",
      body: JSON.stringify(data),
      headers: { ...header, Authorization: "bearer " + tokenMap.get(userId) },
    });
    const d = await res.json();
    await CompleteAchievement(id, userId);
  }
}

async function CompleteAchievement(id, userId) {
  try {
    const domain = "https://api.prod.piggypiggy.io/game/CompleteAchievement";
    const res = await fetch(domain, {
      method: "POST",
      body: JSON.stringify({ AchievementID: id, PlayerID: 0 }),
      headers: { ...header, Authorization: "bearer " + tokenMap.get(userId) },
    });
    await res.json();
    console.log(colors.green("CompleteAchievement:", colors.yellow(id)));
  } catch (e) {
    console.log(e);
  }
}

async function getPlayerBase(id) {
  const domain = "https://api.prod.piggypiggy.io/game/GetPlayerBase";
  const res = await fetch(domain, {
    method: "POST",
    headers: { ...header, Authorization: "bearer " + tokenMap.get(id) },
  });
  const parse = await res.json();
  if (parse.msg === "success" && parse.data) {
    console.log(colors.yellow(userName.get(id) || ""));
    console.log(colors.green("currency:"), colors.yellow(parse.data.currency));
    console.log(
      colors.green("currrencyPool:"),
      colors.yellow(parse.data.currrencyPool)
    );
    console.log(
      colors.green("currrencyPoolHistory:"),
      colors.yellow(parse.data.currrencyPoolHistory)
    );
    console.log(" ");
  }
}

async function loadConfig() {
  const datas = fs
    .readFileSync(rPath("data.txt"), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) => line.length > 0 && decodeURIComponent(line).includes("user=")
    );

  if (datas.length <= 0) {
    console.log(colors.red(`Không tìm thấy dữ liệu`));
    process.exit();
  }
  return datas.map((line) => decodeURIComponent(line));
}

async function takeTask(id, TaskID) {
  const domain = "https://api.prod.piggypiggy.io/game/TakeTask";
  const res = await fetch(domain, {
    method: "POST",
    body: JSON.stringify({ PlayerID: 0, TaskID }),
    headers: { ...header, Authorization: "bearer " + tokenMap.get(id) },
  });

  const p = await res.json();

  if (p.msg === "success" && p.data.curTaskStartTime) {
    console.log(
      colors.yellow(userName.get(id) || ""),
      "",
      colors.green(`${TaskID} bắt đầu chạy..`)
    );
  }
}

async function setupShop(id) {
  const domain = "https://api.prod.piggypiggy.io/game/SetUpShop";
  const res = await fetch(domain, {
    method: "POST",
    body: JSON.stringify({ PlayerID: 0 }),
    headers: { ...header, Authorization: "bearer " + tokenMap.get(id) },
  });

  const p = await res.json();
  if (p.msg === "success") {
    console.log(
      colors.yellow(userName.get(id) + " active thành công, bắt đầu auto")
    );
  }
}

async function getDailyTask(id) {
  const domain = "https://api.prod.piggypiggy.io/game/GetDailyTaskInfo";
  const res = await fetch(domain, {
    method: "POST",
    body: JSON.stringify({ PlayerID: 0 }),
    headers: { ...header, Authorization: "bearer " + tokenMap.get(id) },
  });

  const p = await res.json();

  if (!Object.keys(p?.data || {}).length) {
    // Need active shop
    await setupShop(id);
  }

  if (p.msg === "success" && p.data) {
    if (p.data.curTaskID) {
      console.log(
        colors.yellow(userName.get(id) || ""),
        ": ",
        colors.red(id),
        "",
        colors.green(p.data.curTaskID + " Có thể claim")
      );
      await completeTask(id, p.data.curTaskID);
    }

    //   const data = Object.values(p.data.mapTask);
    //   let index = 0;
    //   for await (const item of data) {
    //     console.log(
    //       colors.yellow(`Task: ${item.taskID}`),
    //       item.compeleteCount
    //         ? colors.green(`Đã claim ${item.compeleteCount} lần!`)
    //         : "",
    //       item.lastCompleteTime
    //         ? colors.green(
    //             `Lần cuối claim: ${timestampToUTC(item.lastCompleteTime)}`
    //           )
    //         : "",
    //       item.schedule
    //         ? console.log(colors.red("Được phép claim: " + item.schedule))
    //         : ""
    //     );

    //     if (item.schedule) {
    //       await completeTask(id, item.taskID);
    //     }

    //     index++;
    //   }
    // }

    for await (const taskId of taskID) {
      await takeTask(id, taskId);
    }

    await getWage(id);
  }

  await delay(5);
}

async function completeTask(id, TaskID) {
  const domain = "https://api.prod.piggypiggy.io/game/CompleteTask";
  const res = await fetch(domain, {
    method: "POST",
    body: JSON.stringify({ PlayerID: 0, TaskID }),
    headers: { ...header, Authorization: "bearer " + tokenMap.get(id) },
  });

  const p = await res.json();
  if (p.msg === "success" && p.data?.taskID === TaskID) {
    console.log(
      colors.yellow(userName.get(id) || ""),
      "",
      colors.green("Claim thành công...")
    );
  } else {
    console.log(colors.red("Claim failed."));
  }
}

async function flowDoing() {
  for await (const id of [...tokenMap.keys()]) {
    await getDailyTask(id);
  }

  await delay(5);
  await flowDoing();
}

(async function main() {
  const c = await loadConfig();
  if (c.length <= 0) {
    console.log(colors.red(`Không tìm thấy dữ liệu`));
    return;
  }

  console.log(" ");

  for await (const profile of c) {
    const userInfo = JSON.parse(parse(profile).user);
    console.log(colors.green(`id: ${userInfo.id} ${userInfo.first_name}`));
    await login(userInfo.id, userInfo.first_name, profile);
  }

  for await (const id of [...tokenMap.keys()]) {
    await getPlayerBase(id);
    // await GetAchievementInfo(id);
  }

  flowDoing();
})();

async function getWage(id) {
  const api = "https://api.prod.piggypiggy.io/game/GetWage";
  const res = await fetch(api, {
    method: "POST",
    body: JSON.stringify({ PlayerID: 0 }),
    headers: { ...header, Authorization: "bearer " + tokenMap.get(id) },
  });
  const r = await res.json();
  if (r.msg === "success" && r.data?.award) {
    console.log(
      colors.yellow(
        `${userName.get(id)} Claim salary thành công: ${r.data?.award}`
      )
    );
  }
}

async function delay(t) {
  for (let i = t; i > 0; i--) {
    const hours = String(Math.floor(i / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((i % 3600) / 60)).padStart(2, "0");
    const seconds = String(i % 60).padStart(2, "0");
    process.stdout.write(
      colors.white(`[*] Cần chờ ${hours}:${minutes}:${seconds}     \r`)
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  process.stdout.write("                                        \r");
}
