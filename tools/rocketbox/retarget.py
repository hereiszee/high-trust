# Rest-pose-aware retargeter + procedural pose helpers for the Rocketbox Bip01 skeleton (bpy / mathutils).
# All "world" quantities are in the target armature space (target armature object is identity: Z-up, -Y forward,
# character's left = +X).
import bpy, math
from mathutils import Matrix, Vector, Quaternion

TFPS = 30

def rot_of(m):
    return m.to_3x3().normalized().to_quaternion()

class Target:
    def __init__(self, arm, bones):
        self.arm = arm
        self.bones = [b for b in bones]               # body bones, hierarchy order (parents first)
        bset = set(self.bones)
        B = arm.data.bones
        self.parent = {b: (B[b].parent.name if B[b].parent and B[b].parent.name in bset else None) for b in self.bones}
        self.rest = {b: B[b].matrix_local.copy() for b in self.bones}
        self.rest_rot = {b: rot_of(self.rest[b]) for b in self.bones}
        self.rest_pos = {b: self.rest[b].translation.copy() for b in self.bones}
        self.rest_rel = {}
        for b in self.bones:
            p = self.parent[b]
            self.rest_rel[b] = (self.rest[p].inverted() @ self.rest[b]) if p else self.rest[b].copy()
        self.hip = self.rest_pos['Bip01 Pelvis'].z

    def fill_rest_relative(self, R):
        """bones missing in R get parent's world rot @ rest-relative rot"""
        for b in self.bones:
            if b not in R:
                p = self.parent[b]
                R[b] = (R[p] @ rot_of(self.rest_rel[b])) if p else self.rest_rot[b]
        return R

    def fk(self, R, pelvis_pos):
        """positions of bone heads given world rotations"""
        P = {}; M = {}
        for b in self.bones:
            p = self.parent[b]
            if p is None:
                pos = pelvis_pos
            else:
                pos = M[p] @ self.rest_rel[b].translation
            P[b] = pos
            M[b] = Matrix.LocRotScale(pos, R[b], None)
        return P

    def write_action(self, name, frames, loop=True):
        """frames: list of (R dict, pelvis_pos Vector). Creates a Blender action with quaternion keys
        (all body bones) + pelvis location."""
        arm = self.arm
        if arm.animation_data is None: arm.animation_data_create()
        act = bpy.data.actions.new(name); act.use_fake_user = True
        arm.animation_data.action = act
        prevq = {}
        for i, (R, ppos) in enumerate(frames):
            M = {}
            f = i + 1
            for b in self.bones:
                p = self.parent[b]
                if p is None:
                    rest_m = self.rest_rel[b]; parent_m = Matrix.Identity(4); pos = ppos
                else:
                    parent_m = M[p]; rest_m = self.rest_rel[b]; pos = (parent_m @ rest_m).translation
                Mb = Matrix.LocRotScale(pos, R[b], None)
                M[b] = Mb
                basis = (parent_m @ rest_m).inverted() @ Mb
                pb = arm.pose.bones[b]
                q = basis.to_quaternion().normalized()
                if b in prevq and prevq[b].dot(q) < 0: q.negate()
                prevq[b] = q
                pb.rotation_mode = 'QUATERNION'
                pb.rotation_quaternion = q
                pb.keyframe_insert('rotation_quaternion', frame=f, group=b)
                if p is None:
                    pb.location = basis.translation
                    pb.keyframe_insert('location', frame=f, group=b)
        return act

# ---------------------------------------------------------------- sources
def sample_times(action_range, src_fps, start=None, end=None):
    a, b = action_range
    if start is not None: a = start
    if end is not None: b = end
    dur = (b - a) / src_fps
    n = max(1, round(dur * TFPS))
    return [a + (k / TFPS) * src_fps for k in range(n + 1)], dur

def eval_at(sc, fr):
    i = math.floor(fr); sc.frame_set(i, subframe=fr - i)

def set_action(obj, act):
    obj.animation_data.action = act
    try:
        if obj.animation_data.action_slot is None and len(act.slots):
            obj.animation_data.action_slot = act.slots[0]
    except AttributeError:
        pass

def retarget_abs(T, S, frs, ratio):
    """Same-convention source (Rocketbox Bip01): copy world rotations; pelvis pos scaled."""
    sc = bpy.context.scene; out = []
    W = S.matrix_world
    for fr in frs:
        eval_at(sc, fr)
        R = {}
        for b in T.bones:
            pb = S.pose.bones.get(b)
            if pb is not None:
                R[b] = rot_of(W @ pb.matrix)
        T.fill_rest_relative(R)
        pp = (W @ S.pose.bones['Bip01 Pelvis'].matrix).translation * ratio
        out.append((R, pp))
    return out

def retarget_dir(T, S, frs, bmap, dir_child_t, dir_child_s, src_hips, ratio, pre_world=None):
    """Different-convention source: per-bone world delta with minimal-arc rest alignment.
    bmap: target bone -> source bone. dir_child_*: bone -> child bone used to define bone direction."""
    sc = bpy.context.scene; W = S.matrix_world
    if pre_world is None: pre_world = Matrix.Identity(4)
    W = pre_world @ W
    srest = {s: rot_of(W @ S.data.bones[s].matrix_local) for s in bmap.values()}
    spos = {s.name: (W @ s.matrix_local).translation for s in S.data.bones}
    A = {}
    for t in T.bones:
        if t not in bmap: continue
        s = bmap[t]
        if t in dir_child_t and dir_child_s.get(s) in spos:
            dt = (T.rest_pos[dir_child_t[t]] - T.rest_pos[t]).normalized()
            ds = (spos[dir_child_s[s]] - spos[s]).normalized()
            A[t] = dt.rotation_difference(ds)
        else:
            p = T.parent[t]
            while p is not None and p not in A: p = T.parent[p]
            A[t] = A[p] if p else Quaternion()
    out = []
    for fr in frs:
        eval_at(sc, fr)
        R = {}
        for t, s in bmap.items():
            Rs = rot_of(W @ S.pose.bones[s].matrix)
            R[t] = Rs @ srest[s].inverted() @ A[t] @ T.rest_rot[t]
        T.fill_rest_relative(R)
        pp = (W @ S.pose.bones[src_hips].matrix).translation * ratio
        out.append((R, pp))
    return out

def make_inplace(frames, center=True):
    p0 = frames[0][1].copy(); pN = frames[-1][1].copy(); n = len(frames) - 1
    out = []
    for i, (R, p) in enumerate(frames):
        t = i / n if n else 0
        d = p0.lerp(pN, t)
        q = p.copy(); q.x -= d.x; q.y -= d.y
        if not center: q.x += p0.x; q.y += p0.y
        out.append((R, q))
    speed = (pN - p0).to_2d().length
    return out, speed

# ---------------------------------------------------------------- procedural helpers
def frame_q(d, u):
    """rotation whose columns are (x=u_perp x d, y=d, z=u_perp)"""
    d = d.normalized(); u = (u - d * u.dot(d)).normalized(); x = d.cross(u)
    m = Matrix((x, d, u)).transposed()
    return m.to_quaternion()

def aim_world(T, b, rest_dir, rest_up, new_dir, new_up):
    """world rot for bone b such that rest_dir->new_dir and rest_up->new_up"""
    delta = frame_q(new_dir, new_up) @ frame_q(rest_dir, rest_up).inverted()
    return delta @ T.rest_rot[b]

def two_bone(S, W, l1, l2, pole):
    d = W - S; L = d.length
    L = min(L, (l1 + l2) * 0.999); L = max(L, abs(l1 - l2) * 1.001)
    dn = d.normalized()
    a = (l1 * l1 - l2 * l2 + L * L) / (2 * L)
    h = math.sqrt(max(0.0, l1 * l1 - a * a))
    pv = (pole - S); pv = (pv - dn * pv.dot(dn)).normalized()
    E = S + dn * a + pv * h
    Wc = S + dn * L
    return E, Wc
