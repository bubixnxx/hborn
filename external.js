// FIND WIDMO
// $( "#ekw_page_items" ).find("div[data-base_item_id=1801]").attr("data-item_id");

Object.assign(BOT, {stop:true, last_location:0});
BOT.finder = new EasyStar.js();
BOT.finder.setAcceptableTiles([1]);

BOT.emit = (data) => GAME.socket.emit('ga', data);

GAME.bindBDB = (con) => {
    BOT.emit({ a:21, bid:con.attr("data-bid") });
    con.remove();
}

GAME.questAction = () => {
    if (GAME.quest_action && GAME.quest_action_count < GAME.quest_action_max) {
        BOT.emit({ a:22, type:7, id:GAME.quest_action_qid, cnt:GAME.quest_action_max });
    }
}

BOT.Start = () => {
    if (BOT.last_location != GAME.char_data.loc) {
        !GAME.mapcell ? BOT.SetMapcell() : false;  
        BOT.last_location = parseInt(GAME.char_data.loc);
        BOT.SetMatrix();
        BOT.location = BOT.SetLocation(BOT.last_location);
    }

    BOT.cd_start = Date.now();

    BOT.moveSteps = BOT.location.steps.slice();
    
    if (BOT.moveSteps[0][0] == GAME.char_data.x && BOT.moveSteps[0][1] == GAME.char_data.y) {
        BOT.moveSteps.shift();
    }

    setTimeout(() => { BOT.Go(); }, 1000);
}

BOT.SetMapcell = () => {
    Object.defineProperty(GAME,'mapcell',{ get: () => { return GAME[Object.keys(GAME).find(z=> GAME[z] && GAME[z]['1_1'])]; } });
}

BOT.SetLocation = (id) => {
    let loc = BOT.locations.filter('id' ? a => a['id'] === id : a => Object.keys(a).some(k => a[k] === id))[0];

    if (loc && !loc.x) {
        loc.x = loc.steps[0][0];
        loc.y = loc.steps[0][1];
    }

    $(".BOT_mapper").fadeOut();

    return !loc ? BOT.AutoMapper() : loc;
}

BOT.SetMatrix = () => {
    BOT.matrix = [];
    for (let i=0; i<GAME.map.max_y; i++) {
        BOT.matrix[i] = [];
        for (let j=0; j<GAME.map.max_x; j++) {
            BOT.matrix[i][j] = (GAME.mapcell[`${j+1}_${i+1}`].m == 1 ? 1 : 0);
        }
    }
    
    BOT.finder.setGrid(BOT.matrix);
}

BOT.AutoMapper = () => {
    let steps = [];
    let first = false;
    let reverse = false;

    for (y = 0; y < BOT.matrix.length; y++) {
        if (BOT.matrix[y].includes(1)) {
            if (!reverse) {        
                for (x = 0; x < BOT.matrix[y].length; x++) {
                    if (BOT.matrix[y][x] === 1){
                        !first ? first = [x+1,y+1] : false;
                        steps.push([x+1,y+1]);
                    }
                }
                reverse = true;
            } else {    
                for (x = BOT.matrix[y].length; x > 0; x--) {
                    if (BOT.matrix[y][x-1] === 1){
                        !first ? first = [x,y+1] : false;
                        steps.push([x,y+1]);
                    }
                }
                reverse = false;
            }
        }
    }

    steps.push(first);
    $(".BOT_mapper").fadeIn();
    return { x: first[0], y: first[1], steps: steps }
}

BOT.GetCooldown = (start, end) => {
    let r = 1000;

    if (BOT.char.cooldown) {
        let cd = 305000;
        let  c = cd - (end - start);

        r = (c < 0 ? 1000 : c);

        $(".BOT_box .cooldown").html(GAME.showTimer(r/1000)).show();
    }

    return r;
}

BOT.Go = () => {
    if (BOT.moveSteps.length > 0) {
        BOT.finder.findPath(GAME.char_data.x-1, GAME.char_data.y-1, BOT.moveSteps[0][0]-1, BOT.moveSteps[0][1]-1, (path) => {
            if (path === null) {
                console.log("path not found");
            } else {
                BOT.path = path;
                if (BOT.moveSteps.length > 0) {
                    BOT.path.shift();
                    BOT.Move();
                }
            }
        });

        BOT.finder.calculate();
    } else if (GAME.char_data.x == BOT.location.steps[0][0] && GAME.char_data.y == BOT.location.steps[0][1]) {
        BOT.cd_wait = setTimeout(() => { BOT.Start(); $(".BOT_box .cooldown").hide(); }, BOT.GetCooldown(BOT.cd_start, Date.now()));
    }
}

BOT.Move = () => {
    if (!BOT.stop) {
        if (BOT.senzu.use && GAME.char_data.pr <= BOT.char.min_pa) {
            setTimeout(() => { BOT.UseSenzu(); }, 1000);
        } else if (BOT.sub.use && $("#doubler_bar").css("display") === "none") {
            setTimeout(() => { BOT.UseSub(); }, 1000);
        } else if ($('#ssj_status').text() == "--:--:--") {
            setTimeout(() => { BOT.CancelSSJ(); }, 1000); console.log("cancel ssj");
        } else if (BOT.char.ssj && $("#ssj_bar").css("display") === "none") {
            setTimeout(() => { BOT.UseSSJ(); }, 3000);
        } else {
            if (BOT.path[0].x > GAME.char_data.x-1 && BOT.path[0].y == GAME.char_data.y-1) {
                BOT.emit({a:4,dir:7,vo:GAME.map_options.vo}); // prawo
            }else if (BOT.path[0].x < GAME.char_data.x-1 && BOT.path[0].y == GAME.char_data.y-1) {
                BOT.emit({a:4,dir:8,vo:GAME.map_options.vo}); // lewo
            }else if (BOT.path[0].x == GAME.char_data.x-1 && BOT.path[0].y > GAME.char_data.y-1) {
                BOT.emit({a:4,dir:1,vo:GAME.map_options.vo}); // dół
            }else if (BOT.path[0].x == GAME.char_data.x-1 && BOT.path[0].y < GAME.char_data.y-1) {
                BOT.emit({a:4,dir:2,vo:GAME.map_options.vo}); // góra
            }else{
                BOT.Go();
            }
        }
    }
}

BOT.Next = () => {
    if (BOT.path.length-1 > 0) {
        BOT.path.shift();
        BOT.Move();
    } else {
        if(BOT.moveSteps.length > 0){
            BOT.moveSteps.shift();
            BOT.Go();
        }
    }
}

BOT.RealLevel = () => {
    if (GAME.char_data.level_lock) $(".BOT_real_lvl_box").show(); else $(".BOT_real_lvl_box").hide(); 
    $(".BOT_real_lvl").html(`${GAME.rebPref(GAME.char_data.reborn)}${GAME.lvlUpSim()}`);
}

BOT.CountMobs = (cm=false) => {
    let r = 0;
    
    for (i in GAME.map_options.ma){
        if (GAME.map_options.ma[i] == 1) {
            r += parseInt(GAME.field_mobs[0].ranks[i]);
        }
    }

    r += cm ? parseInt(GAME.field_mobs[0].ranks[5]) : 0;

    return r;
}

BOT.Fight = () => {
    if (BOT.char.multifight) {
        if (BOT.CountMobs() > 0 && GAME.field_mf[0] < 2) {
            BOT.emit({a:7,order:2,quick:1,fo:GAME.map_options.ma}); // kill from the strongest to set multifight
        } else if (GAME.field_mf[0] < 3 && GAME.map_options.ma[3] === 1 && GAME.field_mobs[0].ranks[3]) {
            BOT.emit({a: 7, mob_num: 0, rank: 3, quick: 1}); // kill legend if exists
        } else if (GAME.map_options.ma[4] === 1 && GAME.field_mobs[0].ranks[4]) {
            BOT.emit({a: 7, mob_num: 0, rank: 4, quick: 1}); // kill epic if exists
        } else if (GAME.field_mobs[0].ranks[5]) {
            BOT.emit({a: 7, mob_num: 0, rank: 5, quick: 1}); // kill mystic if exists
        } else {
            BOT.emit({a: 13, mob_num: 0, fo: GAME.map_options.ma}) // multifight
        }
    } else {
        BOT.emit({a:7,order:2,quick:1,fo:GAME.map_options.ma});
    }
}

BOT.CalcYellow = () => {
    let yellow_res = GAME.getCharMaxPr() * 0.15 + 10000;
    return Math.floor((GAME.getCharMaxPr() - GAME.char_data.pr) / yellow_res);
}

BOT.GetSenzu = () => {
    switch (BOT.senzu.which) {
        case "blue": return GAME.quick_opts.senzus.find(senzu => senzu.item_id === 1244); break;
        case "yellow": return GAME.quick_opts.senzus.find(senzu => senzu.item_id === 1260); break;
        case "red": return GAME.quick_opts.senzus.find(senzu => senzu.item_id === 1243); break;
        case "magic": return GAME.quick_opts.senzus.find(senzu => senzu.item_id === 1309); break;
    }
}

BOT.UseSenzu = () => {
    let senzu = BOT.GetSenzu();

    if (!senzu) {
        BOT.stop = true;
    } else {
        switch (BOT.senzu.which) {
            case "blue": BOT.emit({a:12, type:14, iid:senzu.id, page:GAME.ekw_page, am:Math.floor(GAME.getCharMaxPr() / 100 * 0.5)}); break;
            case "yellow": BOT.emit({a:12, type:14, iid:senzu.id, page:GAME.ekw_page, am:BOT.CalcYellow()}); break;
            case "red": BOT.emit({a:12, type:14, iid:senzu.id, page:GAME.ekw_page, am:1}); break;
            case "magic": BOT.emit({a:12, type:14, iid:senzu.id, page:GAME.ekw_page, am:1}); break;
        }
    }
}

BOT.UseSSJ = () => {
    BOT.emit({a: 18, type: 5, tech_id: GAME.quick_opts.ssj[0]});
}

BOT.CancelSSJ = () => {
    BOT.emit({a:18,type:6});
}

BOT.UseSub = () => {
    BOT.emit({a: 12, type: 19, iid: GAME.quick_opts.sub[BOT.sub.which].id});
}

BOT.PreparePanel = () => {
    $(".BOT_cnt input[name=usesenzu]").prop('checked', !BOT.senzu.use ? false : true);
    $(".BOT_cnt input[name=usesub]").prop('checked', !BOT.sub.use ? false : true);
    $(".BOT_cnt input[name=multi]").prop('checked', !BOT.char.multifight ? false : true);
    $(".BOT_cnt input[name=ssj]").prop('checked', !BOT.char.ssj ? false : true);

    $(".BOT_version").html(`v${BOT.version}`);

    !BOT.senzu.use ?  $(".BOT_senzu").hide() :  $(".BOT_senzu").show();
    $(`.BOT_senzu input[value=${BOT.senzu.which}]`).prop('checked', true);

    !BOT.sub.use ?  $(".BOT_sub").hide() :  $(".BOT_sub").show();
    $(`.BOT_sub input[value=${BOT.sub.which}]`).prop('checked', true);

    $( "#BOT_Panel" ).draggable({ handle: ".BOT_header" });
    $(".BOT_cnt input[type=checkbox], input[type=radio]").change((chb) => { BOT.HandleChbox($(chb.target)); });

    $(".range_slider input[type=range]").val(BOT.char.min_pa);
    $(".minpa_val").html(`PA: ${GAME.dots(BOT.char.min_pa)}`);

    BOT.RealLevel();
}

BOT.HandleChbox = (chb) => {
    let name = chb.attr("name");
    switch(name) {
        case "usesenzu": BOT.senzu.use = chb.is(':checked') ? true : false; $(".BOT_senzu").fadeToggle("fast"); break;
        case "usesub": BOT.sub.use = chb.is(':checked') ? true : false; $(".BOT_sub").fadeToggle("fast"); break;
        case "multi": BOT.char.multifight = chb.is(':checked') ? true : false; break;
        case "use_senzu": BOT.senzu.which = chb.val(); break;
        case "use_sub": BOT.sub.which = parseInt(chb.val()); break;
        case "ssj": BOT.char.ssj = chb.is(':checked') ? true : false; break;
    }
}

GAME.socket.on('gr', (res) => {
    if (!BOT.stop && res.a === 4 && res.char_id === GAME.char_id) { // Move response
        BOT.Fight();
    } else if (!BOT.stop && res.a === 7) { // fight mobs response
        if (BOT.CountMobs(true) == 0) {
            BOT.Next();
        } else {
            BOT.Fight();
        }
    } else if (!BOT.stop && res.a === 12 && res.type === 14) { // Use senzu respone
        setTimeout(() => { BOT.Go(); }, 1000);
    } else if (!BOT.stop && res.a === 18 && res.ssj) { // Use ssj response
        setTimeout(() => { BOT.Go(); }, 2000);
    } else if (!BOT.stop && res.a === 18 && res.cancel_ssj) { // Use cancel ssj response
        setTimeout(() => { BOT.UseSSJ(); }, 1000); console.log("cancel ssj response");
    }  else if (!BOT.stop && res.a === 12 && res.type === 19) { // Use sub respone
        setTimeout(() => { BOT.Go(); }, 1000);
    } else if (!this.stop && res.a === undefined) {
        setTimeout(() => { BOT.Go(); }, 1000);
    }
});

$(".BOT_box .start").click((th) => {
    th = th.target;
    if (BOT.stop) {
        BOT.stop = false;
        BOT.Start();
        $(th).addClass("stop").html("STOP");
        $(".BOT_box .resume").hide();
    } else {
        BOT.stop = true;

        $(th).removeClass("stop").html("START");
        $(".BOT_box .resume").show();

        if (BOT.cd_wait) {
            clearTimeout(BOT.cd_wait);
        }

        if (BOT.path.length === 1) {
            BOT.moveSteps.shift();
        }

        $(".BOT_box .cooldown").hide();
    }
});

$(".BOT_box .resume").click(() => {
    $(".BOT_box .start").addClass("stop").html("STOP");
    $(".BOT_box .resume").hide();
    BOT.stop = false;
    BOT.Go();
});

$(".BOT_box .BOT_calc_Lvl").click(() => {
    BOT.RealLevel();
});

$(".range_slider").on("input",(e) => {
    $(".minpa_title").css("display", "none");
    $(".minpa_val").html(`PA: ${GAME.dots($(e.target).val())}`).css("display", "block");
  }).mouseup((e) => {
      BOT.char.min_pa = parseInt($(e.target).val());
      $(".minpa_val").css("display", "none");
      $(".minpa_title").css("display", "block");
  });

console.clear();
console.log('%cSkrypt został poprawnie załadowany!','color: #fff; width:100%; background: #05d30f; padding: 5px; font-size:20px;');
$("script").last().remove();

const bot_auth = [448639,457638,433273,464892,468932,442405,421729,432743,476609,454758,424489,409292,476597,479357,465593,477259,472756,291156,322483,480606,462458,433094,458895,345396,301296,414783,453948,480816,462824,481184,480844,480287,481355,477658,271757,481489,480524,481568,481580,465698,466871,288701,467357];
//291156 - Naruto, 322483, 480606 - Goldas, 462458, 433094 - BaronCorbin, 458895 - Krast, 345396 - Nordex, 301296 - Trybik, 414783 - Gildarts, 453948 - ares, 480816 - essiu, 462824 - cadoro, 481184 - pawelma, 480844 - Ryder (do końca października) 480287 - Gokukowsky, 481355 - Oxari (Slash), 477658 - xMore, 271757 - Naimad, 481489 - Agnar, 480524 - avadr, 481568, 481580 - BooBlessJR(tomekG), 465698 - Biały, 477259 & 472756 - Werni, 465593 - Korniszon, 466871 - Mackey,288701 - Martin, 467357 - Mnich
if (!bot_auth.includes(GAME.pid)) {
    $("#BOT_Panel").remove();
    delete  BOT;
    GAME.socket.disconnect();
    location.href="https://kosmiczni.pl/rules";
}
