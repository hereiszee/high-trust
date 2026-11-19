# Builds anims.glb: every clip retargeted/baked onto the dad_player (Male_Adult_14) Bip01 skeleton.
import bpy, sys, os, json, math
sys.path.insert(0, os.path.dirname(__file__))
from rbcommon import *
from retarget import *
from mathutils import Matrix, Vector, Quaternion, Euler

args = sys.argv[sys.argv.index('--') + 1:]
RB, UAL1, UAL2, QMOD, OUT = args[:5]
ONLY = set(args[5].split(',')) if len(args) > 5 and args[5] else None
reset()
arm, meshes = import_rocketbox(os.path.join(RB, 'Avatars/Adults/Male_Adult_14/Export/Male_Adult_14.fbx'))
for m in meshes: bpy.data.objects.remove(m, do_unlink=True)
T = Target(arm, body_bones(arm))
print('target hip', T.hip, 'bones', len(T.bones))
ST = os.path.join(RB, 'Animations/all_animations_max_motextr_static')
XY = os.path.join(RB, 'Animations/all_animations_max_motextr_xy')
meta = {}

def objs_snapshot(): return set(bpy.data.objects), set(bpy.data.actions)
def cleanup(snap):
    o0, a0 = snap
    for o in list(bpy.data.objects):
        if o not in o0: bpy.data.objects.remove(o, do_unlink=True)
    for a in list(bpy.data.actions):
        if a not in a0 and not a.use_fake_user: bpy.data.actions.remove(a)

RB_CACHE = {}
def rb_frames(path, inplace=False, start=None, end=None):
    key = (path, inplace, start, end)
    if key in RB_CACHE: return RB_CACHE[key]
    snap = objs_snapshot()
    bpy.ops.import_scene.fbx(filepath=path, use_anim=True)
    S = [o for o in bpy.data.objects if o not in snap[0] and o.type == 'ARMATURE'][0]
    act = S.animation_data.action
    frs, dur = sample_times(tuple(act.frame_range), 30.0, start, end)
    fr = retarget_abs(T, S, frs, T.hip / 0.8952)
    cleanup(snap)
    speed = 0
    if inplace:
        fr, dist = make_inplace(fr); speed = dist / dur
    RB_CACHE[key] = (fr, speed)
    return fr, speed

# ---- UAL (Quaternius Universal Animation Library, Rigify-style DEF- bones)
UMAP = {'Bip01 Pelvis': 'DEF-hips', 'Bip01 Spine': 'DEF-spine.001', 'Bip01 Spine1': 'DEF-spine.002', 'Bip01 Spine2': 'DEF-spine.003',
        'Bip01 Neck': 'DEF-neck', 'Bip01 Head': 'DEF-head'}
for s, u in (('L', 'L'), ('R', 'R')):
    UMAP.update({f'Bip01 {s} Clavicle': f'DEF-shoulder.{u}', f'Bip01 {s} UpperArm': f'DEF-upper_arm.{u}', f'Bip01 {s} Forearm': f'DEF-forearm.{u}',
                 f'Bip01 {s} Hand': f'DEF-hand.{u}', f'Bip01 {s} Thigh': f'DEF-thigh.{u}', f'Bip01 {s} Calf': f'DEF-shin.{u}',
                 f'Bip01 {s} Foot': f'DEF-foot.{u}', f'Bip01 {s} Toe0': f'DEF-toe.{u}'})
    for i, fn in enumerate(['thumb', 'f_index', 'f_middle', 'f_ring', 'f_pinky']):
        for j, suf in enumerate(['', '1', '2']):
            UMAP[f'Bip01 {s} Finger{i}{suf}'] = f'DEF-{fn}.0{j+1}.{u}'
def chain_children(m):
    """target dir children from hierarchy"""
    d = {}
    for t in m:
        kids = [c for c in T.bones if T.parent[c] == t and c in m]
        pref = [c for c in kids if 'Spine' in c or 'Neck' in c or 'Head' in c or 'Finger2' in c and 'Finger2' == c.split()[-1] or 'Calf' in c or 'Foot' in c or 'Toe' in c or 'Forearm' in c or 'Hand' in c or 'UpperArm' in c]
        if t.endswith('Pelvis'): pref = ['Bip01 Spine']
        if t.endswith('Hand'): pref = [t.replace('Hand', 'Finger2')]
        if t.endswith('Clavicle'): pref = [t.replace('Clavicle', 'UpperArm')]
        c = pref[0] if pref else (kids[0] if len(kids) == 1 else None)
        if c: d[t] = c
    return d
UDIR_T = chain_children(UMAP)
UDIR_S = {UMAP[t]: UMAP[c] for t, c in UDIR_T.items()}

UAL_LOADED = {}
def ual_frames(glb, action, inplace=False, start=None, end=None, mapping=None, dirt=None, dirs=None, hips='DEF-hips', pre_world=None):
    mapping = mapping or UMAP; dirt = dirt or UDIR_T; dirs = dirs or UDIR_S
    snap = objs_snapshot()
    bpy.ops.import_scene.gltf(filepath=glb)
    S = [o for o in bpy.data.objects if o not in snap[0] and o.type == 'ARMATURE'][0]
    fps = bpy.context.scene.render.fps
    act = bpy.data.actions[action]
    set_action(S, act)
    frs, dur = sample_times(tuple(act.frame_range), fps, start, end)
    src_hip = (S.matrix_world @ S.data.bones[hips].matrix_local).translation.z
    fr = retarget_dir(T, S, frs, mapping, dirt, dirs, hips, T.hip / src_hip, pre_world)
    # remove all imported actions/objects
    o0, a0 = snap
    for o in list(bpy.data.objects):
        if o not in o0: bpy.data.objects.remove(o, do_unlink=True)
    for a in list(bpy.data.actions):
        if a not in a0 and not a.use_fake_user: bpy.data.actions.remove(a)
    bpy.context.scene.render.fps = 30
    speed = 0
    if inplace:
        fr, dist = make_inplace(fr); speed = dist / dur
    return fr, speed

# ---- UAL2 uses Unreal-style names
EMAP = {'Bip01 Pelvis': 'pelvis', 'Bip01 Spine': 'spine_01', 'Bip01 Spine1': 'spine_02', 'Bip01 Spine2': 'spine_03', 'Bip01 Neck': 'neck_01', 'Bip01 Head': 'Head'}
for s_, u in (('L', 'l'), ('R', 'r')):
    EMAP.update({f'Bip01 {s_} Clavicle': f'clavicle_{u}', f'Bip01 {s_} UpperArm': f'upperarm_{u}', f'Bip01 {s_} Forearm': f'lowerarm_{u}',
                 f'Bip01 {s_} Hand': f'hand_{u}', f'Bip01 {s_} Thigh': f'thigh_{u}', f'Bip01 {s_} Calf': f'calf_{u}',
                 f'Bip01 {s_} Foot': f'foot_{u}', f'Bip01 {s_} Toe0': f'ball_{u}'})
    for i, fn in enumerate(['thumb', 'index', 'middle', 'ring', 'pinky']):
        for j, suf in enumerate(['', '1', '2']):
            EMAP[f'Bip01 {s_} Finger{i}{suf}'] = f'{fn}_0{j+1}_{u}'
EDIR_T = chain_children(EMAP)
EDIR_S = {EMAP[t]: EMAP[c] for t, c in EDIR_T.items()}

# ---- Quaternius Ultimate Modular rig (for strafes)
QMAP = {'Bip01 Pelvis': 'Hips', 'Bip01 Spine': 'Abdomen', 'Bip01 Spine1': 'Torso', 'Bip01 Spine2': 'Chest', 'Bip01 Neck': 'Neck', 'Bip01 Head': 'Head'}
for s in 'LR':
    QMAP.update({f'Bip01 {s} Clavicle': f'Shoulder.{s}', f'Bip01 {s} UpperArm': f'UpperArm.{s}', f'Bip01 {s} Forearm': f'LowerArm.{s}',
                 f'Bip01 {s} Hand': f'Wrist.{s}', f'Bip01 {s} Thigh': f'UpperLeg.{s}', f'Bip01 {s} Calf': f'LowerLeg.{s}', f'Bip01 {s} Foot': f'Foot.{s}'})
QDIR_T = {t: c for t, c in chain_children(QMAP).items() if c in QMAP}
QDIR_T.pop('Bip01 L Hand', None); QDIR_T.pop('Bip01 R Hand', None); QDIR_T.pop('Bip01 L Foot', None); QDIR_T.pop('Bip01 R Foot', None)
QDIR_S = {QMAP[t]: QMAP[c] for t, c in QDIR_T.items()}

# ------------------------------------------------------------ pose helpers
def world_delta_apply(R, b, newR):
    """set world rot of b, carrying all descendants rigidly"""
    delta = newR @ R[b].inverted()
    def rec(x):
        for c in T.bones:
            if T.parent[c] == x:
                R[c] = delta @ R[c]; rec(c)
    R[b] = newR; rec(b)

def rotate_bone(R, b, axis, deg):
    q = Quaternion(Vector(axis).normalized(), math.radians(deg))
    world_delta_apply(R, b, q @ R[b])

RP = T.rest_pos
def arm_ik(R, pp, side, wrist, pole, hand_dir, thumb_dir, clav_up=0.0):
    s = side
    C, UA, FA, H = f'Bip01 {s} Clavicle', f'Bip01 {s} UpperArm', f'Bip01 {s} Forearm', f'Bip01 {s} Hand'
    if clav_up:
        rotate_bone(R, C, (0, 1, 0) if s == 'L' else (0, -1, 0), clav_up)
    P = T.fk(R, pp)
    S0, E0, W0 = RP[UA], RP[FA], RP[H]
    F0 = RP[f'Bip01 {s} Finger2']; I0 = RP[f'Bip01 {s} Finger1']; K0 = RP[f'Bip01 {s} Finger4']
    l1 = (E0 - S0).length; l2 = (W0 - E0).length
    E, Wc = two_bone(P[UA], Vector(wrist), l1, l2, Vector(pole))
    elbow_out = E - (P[UA] + (Wc - P[UA]).normalized() * (E - P[UA]).dot((Wc - P[UA]).normalized()))
    thumb0 = I0 - K0
    world_delta_apply(R, UA, aim_world(T, UA, E0 - S0, Vector((0, 1, 0)), E - P[UA], elbow_out))
    world_delta_apply(R, FA, aim_world(T, FA, W0 - E0, thumb0, Wc - E, Vector(thumb_dir)))
    world_delta_apply(R, H, aim_world(T, H, F0 - W0, thumb0, Vector(hand_dir), Vector(thumb_dir)))

def curl_fingers(R, side, deg, thumb=0.0):
    """curl fingers 1-4 of a hand by deg per joint about the knuckle line (index->pinky)"""
    P = T.fk(R, Vector((0, 0, 0)))
    lat = (P[f'Bip01 {side} Finger1'] - P[f'Bip01 {side} Finger4']).normalized()
    sg = 1 if side == 'R' else -1
    for i in range(1, 5):
        for suf in ('', '1', '2'):
            rotate_bone(R, f'Bip01 {side} Finger{i}{suf}', lat, sg * deg)
    if thumb:
        P = T.fk(R, Vector((0, 0, 0)))
        ax = (P[f'Bip01 {side} Finger2'] - P[f'Bip01 {side} Hand']).normalized()
        for suf in ('1', '2'):
            rotate_bone(R, f'Bip01 {side} Finger0{suf}', ax, sg * thumb)

def leg_kneel(R, pp, side, knee_fwd=-0.05, foot_back=None):
    s = side
    TH, CA, FO = f'Bip01 {s} Thigh', f'Bip01 {s} Calf', f'Bip01 {s} Foot'
    P = T.fk(R, pp)
    K = Vector((P[TH].x, P[TH].y + knee_fwd, 0.085))
    l2 = (RP[FO] - RP[CA]).length
    A = K + Vector((0, l2 * 0.97, 0.06))
    toe = RP[f'Bip01 {s} Toe0']
    world_delta_apply(R, TH, aim_world(T, TH, RP[CA] - RP[TH], Vector((0, -1, 0)), K - P[TH], Vector((0, -1, 0))))
    world_delta_apply(R, CA, aim_world(T, CA, RP[FO] - RP[CA], Vector((0, -1, 0)), A - K, Vector((0, 0, -1))))
    world_delta_apply(R, FO, aim_world(T, FO, toe - RP[FO], Vector((0, 0, 1)), Vector((0, 1, -0.35)), Vector((0, 0.3, -1))))

# ------------------------------------------------------------ clip definitions
clips = []
def ground_fix(frames):
    """shift pelvis height so the lowest ankle over the clip sits at rest ankle height"""
    m = min(min(P['Bip01 L Foot'].z, P['Bip01 R Foot'].z) for P in (T.fk(R, p) for R, p in frames))
    d = RP['Bip01 L Foot'].z - m
    print('ground_fix', round(d, 3))
    return [(R, p + Vector((0, 0, d))) for R, p in frames]

def foot_speed(frames):
    """in-place locomotion: estimate ground speed from the planted (lowest) foot's horizontal velocity"""
    vs = []
    prev = None
    for R, p in frames:
        P = T.fk(R, p)
        a, b = P['Bip01 L Foot'], P['Bip01 R Foot']
        lo = a if a.z < b.z else b
        key = 'L' if a.z < b.z else 'R'
        if prev and prev[0] == key: vs.append((lo - prev[1]).to_2d().length * TFPS)
        prev = (key, lo)
    vs.sort()
    return vs[len(vs) // 2] if vs else 0.0

def add(name, frames, speed=0.0, loop=True, src=''):
    if ONLY and name not in ONLY: return
    if speed == 0 and any(k in name for k in ('walk', 'strafe', 'run_back')): speed = foot_speed(frames)
    T.write_action(name, frames)
    dur = (len(frames) - 1) / TFPS
    meta[name] = {'duration': round(dur, 3), 'frames': len(frames), 'loop': loop, 'inPlace': True, 'speed_m_s': round(speed, 3), 'source': src}
    print('CLIP', name, len(frames), round(dur, 2), 'speed', round(speed, 2))

def want(*names): return ONLY is None or any(n in ONLY for n in names)

# Rocketbox native mocap (MIT)
RBCLIPS = [
    ('idle', ST, 'm_idle_neutral_01', False), ('idle_look', ST, 'm_idle_look_around_01', False), ('idle_nervous', ST, 'm_idle_nervous_01', False),
    ('idle_angry', ST, 'm_idle_angry_01', False), ('crouch_idle', ST, 'm_crouch_idle', False), ('sit', ST, 'm_sit_chair_idle_neutral_01', False),
    ('sit_breathe', ST, 'm_sit_chair_breathe_01', False), ('walk', XY, 'm_walk_neutral_01', True), ('walk_fast', XY, 'm_walk_fast_01', True),
    ('jog', XY, 'm_run_slow_01', True), ('run', XY, 'm_run_neutral', True), ('sprint', XY, 'm_run_fast_01', True),
    ('f_idle', ST, 'f_idle_neutral_01', False), ('f_walk', XY, 'f_walk_neutral_01', True), ('f_sit', ST, 'f_sit_chair_breathe_01', False),
]
def loop_trim(fr, N, K=24):
    """keep N frames; ease the last K back to frame 0 so the clip loops"""
    fr = fr[:N + 1]
    out = []
    for i, (R, p) in enumerate(fr):
        if i > N - K:
            w = (i - (N - K)) / K; w = w * w * (3 - 2 * w)
            R0, p0 = fr[0]
            R = {k: R[k].slerp(R0[k], w) for k in R}; p = p.lerp(p0, w)
        out.append((R, p))
    return out

MAXF = {'idle': 240, 'idle_nervous': 270, 'idle_angry': 240, 'crouch_idle': 207, 'sit': 240, 'sit_breathe': 240, 'f_idle': 240, 'f_sit': 240}
for name, d, f, ip in RBCLIPS:
    if not want(name): continue
    fr, sp = rb_frames(os.path.join(d, f + '.max.fbx'), inplace=ip)
    if not ip: fr, _ = make_inplace(fr, center=False)  # removes slow drift only
    if name in MAXF and len(fr) > MAXF[name] + 1: fr = loop_trim(fr, MAXF[name])
    add(name, fr, sp, src='Rocketbox ' + f)

# UAL retargets (CC0)
UALCLIPS = [
    ('crouch_walk', UAL1, 'Crouch_Fwd_Loop', True), ('pistol_idle', UAL1, 'Pistol_Idle_Loop', False), ('pistol_aim', UAL1, 'Pistol_Aim_Neutral', False),
    ('pistol_aim_up', UAL1, 'Pistol_Aim_Up', False), ('pistol_aim_down', UAL1, 'Pistol_Aim_Down', False),
    ('pistol_fire', UAL1, 'Pistol_Shoot', False), ('pistol_reload', UAL1, 'Pistol_Reload', False), ('death', UAL1, 'Death01', False),
    ('hit_chest', UAL1, 'Hit_Chest', False), ('hit_head', UAL1, 'Hit_Head', False), ('hit_knockback', UAL2, 'Hit_Knockback', False),
    ('punch', UAL1, 'Punch_Cross', False), ('interact', UAL1, 'Interact', False), ('idle_arms_folded', UAL2, 'Idle_FoldArms_Loop', False),
    ('ual_crouch_idle', UAL1, 'Crouch_Idle_Loop', False),
]
for name, g, a, ip in UALCLIPS:
    if not want(name): continue
    if g == UAL2: fr, sp = ual_frames(g, a, inplace=ip, mapping=EMAP, dirt=EDIR_T, dirs=EDIR_S, hips='pelvis')
    else: fr, sp = ual_frames(g, a, inplace=ip)
    if not ip: fr, _ = make_inplace(fr, center=False)
    add(name, fr, sp, loop=a.endswith('Loop') or 'Aim' in a, src='Quaternius UAL ' + a)

# Quaternius modular strafes (CC0) — glb has Y-up converted by importer already
for name, a in (('strafe_left', 'Run_Left'), ('strafe_right', 'Run_Right'), ('run_back', 'Run_Back')):
    if not want(name): continue
    fr, sp = ual_frames(QMOD, a, inplace=True, mapping=QMAP, dirt=QDIR_T, dirs=QDIR_S, hips='Hips')
    fr = ground_fix(fr)
    add(name, fr, sp, src='Quaternius Ultimate Modular Men ' + a)

# ------------------------------------------------------------ procedural poses on Rocketbox idle base
def idle_base(N=120, K=20):
    """first N frames of the Rocketbox idle, last K frames eased back to frame 0 so it loops"""
    fr, _ = rb_frames(os.path.join(ST, 'm_idle_neutral_01.max.fbx'))
    fr, _ = make_inplace(fr, center=False)
    fr = fr[:N + 1]
    out = []
    for i, (R, p) in enumerate(fr):
        R = {k: v.copy() for k, v in R.items()}; p = p.copy()
        if i > N - K:
            w = (i - (N - K)) / K; w = w * w * (3 - 2 * w)
            R0, p0 = fr[0]
            R = {k: R[k].slerp(R0[k], w) for k in R}; p = p.lerp(p0, w)
        out.append((R, p))
    return out

AIM = {"rwo": [-0.03, 0.05, -0.02], "rhd": [0.3, -0.9, 0.25], "lwo": [0.035, 0.07, -0.045], "lhd": [-0.35, -0.9, 0.3], "lcurl": 22, "lthumb": 10}
AIM.update(json.loads(os.environ.get('AIMCFG', '{}')))
RIFLE_O = []
def rifle_pose(R, pp, recoil=0.0):
    """Rifle shouldered, aimed straight ahead (-Y). Geometry matches assets/props/gun_rifle.glb:
    origin at top of grip, stock butt 0.25 m behind origin, handguard centre 0.30 m ahead."""
    rotate_bone(R, 'Bip01 Spine', (1, 0, 0), AIM.get('lean', 5) - recoil * 3)
    rotate_bone(R, 'Bip01 Spine1', (0, 0, 1), AIM.get('twist', -10))
    rotate_bone(R, 'Bip01 Spine2', (0, 0, 1), AIM.get('twist2', -5))
    P = T.fk(R, pp)
    sh = P['Bip01 R UpperArm']
    pocket = Vector((sh.x + AIM.get('px', 0.07), sh.y + AIM.get('py', -0.03) + recoil * 0.05, sh.z + AIM.get('pz', 0.06)))
    O = pocket + Vector((0, -0.25, -0.02))
    g = lambda k, d: Vector(AIM.get(k, d))
    Gc = O + Vector((0, 0.025, -0.06))                       # grip centre
    H = O + Vector((0, -0.30, 0.045))                       # handguard centre
    rw = Gc + g('rwo', (-0.025, 0.075, -0.035)); lw = H + g('lwo', (0.03, 0.06, -0.075))
    arm_ik(R, pp, 'R', rw, (sh.x - 0.5, sh.y + 0.2, sh.z - 0.45), g('rhd', (0.45, -0.8, 0.4)), g('rht', (0, 0.35, 1)))
    arm_ik(R, pp, 'L', lw, (sh.x + 0.6, sh.y - 0.2, sh.z - 0.7), g('lhd', (-0.4, -0.8, 0.45)), g('lht', (1, 0, 0.3)))
    RIFLE_O.append(O.copy())
    rotate_bone(R, 'Bip01 Head', (1, 0, 0), AIM.get('headdown', 10))
    rotate_bone(R, 'Bip01 Head', (0, 1, 0), AIM.get('headroll', -8))

def hand_from(R, Rsrc, side):
    """copy finger local rotations (relative to hand) from Rsrc"""
    h = f'Bip01 {side} Hand'
    for b in T.bones:
        if b.startswith(f'Bip01 {side} Finger'):
            R[b] = R[h] @ Rsrc[h].inverted() @ Rsrc[b]

def rifle_hands(R):
    hand_from(R, gR, 'R')
    for b in T.bones:
        if 'L Finger' in b: R[b] = R['Bip01 L Hand'] @ T.rest_rot['Bip01 L Hand'].inverted() @ T.rest_rot[b]
    curl_fingers(R, 'L', AIM.get('lcurl', 35), AIM.get('lthumb', 0))
    curl_fingers(R, 'R', AIM.get('rcurl', 0), 0)

if want('rifle_aim', 'rifle_fire', 'rifle_idle'):
    base = idle_base()
    grip, _ = ual_frames(UAL1, 'Pistol_Aim_Neutral')
    gR = grip[0][0]
    out = []
    for R, pp in base:
        rifle_pose(R, pp); rifle_hands(R); out.append((R, pp))
    add('rifle_aim', out, src='procedural (IK) on Rocketbox idle')
    o = RIFLE_O[0]
    meta['_rifle_origin_frame0'] = [round(o.x, 4), round(o.z, 4), round(-o.y, 4)]  # glTF/three coords (Y up, +Z forward)
    # fire: 0.3s recoil
    out = []; R0, p0 = idle_base()[0]
    n = 9
    for i in range(n + 1):
        t = i / n; rc = math.sin(min(1, t * 3) * math.pi / 2) * (1 - t) ** 1.5 * 1.4
        R = {k: v.copy() for k, v in R0.items()}
        rifle_pose(R, p0, recoil=rc); rifle_hands(R); out.append((R, p0))
    add('rifle_fire', out, loop=False, src='procedural (IK)')

def hands_up_pose(R, pp, kneel=False):
    P = T.fk(R, pp)
    for s, sx in (('R', -1), ('L', 1)):
        sh = P[f'Bip01 {s} UpperArm']
        w = (sh.x + sx * 0.24, sh.y - 0.06, sh.z + 0.30)
        pole = (sh.x + sx * 0.8, sh.y + 0.2, sh.z - 0.3)
        arm_ik(R, pp, s, w, pole, (sx * 0.08, -0.12, 1.0), (-sx * 1.0, 0.0, 0.1), clav_up=12)
    rotate_bone(R, 'Bip01 Head', (1, 0, 0), -4)

if want('hands_up'):
    out = []
    for R, pp in idle_base():
        hands_up_pose(R, pp); out.append((R, pp))
    add('hands_up', out, src='procedural (IK) on Rocketbox idle')

def kneel_pose(R, pp):
    knee_h = 0.085
    l1 = (RP['Bip01 L Calf'] - RP['Bip01 L Thigh']).length
    pp = pp.copy(); pp.z = knee_h + l1 * 0.985 + (RP['Bip01 Pelvis'].z - RP['Bip01 L Thigh'].z)
    rotate_bone(R, 'Bip01 Pelvis', (1, 0, 0), 0)
    leg_kneel(R, pp, 'L'); leg_kneel(R, pp, 'R')
    return pp

if want('kneel_cuffed', 'kneel_hands_up', 'kneel'):
    bb = idle_base()
    out = []; out2 = []
    for R, pp in bb:
        R2 = {k: v.copy() for k, v in R.items()}
        p = kneel_pose(R, pp)
        rotate_bone(R, 'Bip01 Spine', (1, 0, 0), 6)
        P = T.fk(R, p)
        pel = P['Bip01 Pelvis']
        for s, sx in (('R', -1), ('L', 1)):
            w = (pel.x + sx * 0.045, pel.y + 0.20, pel.z + 0.06)
            pole = (pel.x + sx * 0.6, pel.y + 0.55, pel.z + 0.35)
            arm_ik(R, p, s, w, pole, (-sx * 0.5, 0.25, -0.8), (0.0, 1.0, 0.2))
        rotate_bone(R, 'Bip01 Head', (1, 0, 0), 14)
        out.append((R, p))
        p2 = kneel_pose(R2, pp); hands_up_pose(R2, p2); out2.append((R2, p2))
    add('kneel_cuffed', out, src='procedural (IK) on Rocketbox idle')
    add('kneel_hands_up', out2, src='procedural (IK) on Rocketbox idle')

# ------------------------------------------------------------ export
arm.animation_data.action = None
for b in arm.pose.bones:
    b.rotation_quaternion = (1, 0, 0, 0); b.location = (0, 0, 0)
json.dump(meta, open(OUT.replace('.glb', '.json'), 'w'), indent=1)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=True, export_animation_mode='ACTIONS',
    export_skins=True, export_def_bones=False, export_force_sampling=True, export_optimize_animation_size=True,
    export_extras=True, export_yup=True, export_rest_position_armature=True, export_reset_pose_bones=True)
print('WROTE', OUT)
