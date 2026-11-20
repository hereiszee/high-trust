# Simple accessories (cap, sunglasses, whistle) + belly morph for Rocketbox characters.
# Accessories are separate skinned meshes rigidly bound to one bone so the game can toggle them.
import bpy, bmesh, math
from mathutils import Vector, Matrix

def dominant_bone_verts(mesh, names):
    idx = {mesh.vertex_groups[n].index for n in names if n in mesh.vertex_groups}
    out = []
    for v in mesh.data.vertices:
        if not v.groups: continue
        g = max(v.groups, key=lambda g: g.weight)
        if g.group in idx: out.append(v)
    return out

def head_names(arm):
    head = arm.data.bones['Bip01 Head']
    return ['Bip01 Head'] + [c.name for c in head.children_recursive]

def mat(name, color, rough=0.8, metal=0.0, normal_img=None):
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    b = nt.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    return m

def bind(obj, arm, bone):
    obj.parent = arm
    vg = obj.vertex_groups.new(name=bone)
    vg.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
    md = obj.modifiers.new('Armature', 'ARMATURE'); md.object = arm

def new_obj(name, bm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    for p in me.polygons: p.use_smooth = True
    return o

def head_info(arm, mesh, lo=0.10, hi=0.08):
    vs = dominant_bone_verts(mesh, head_names(arm))
    zs = [v.co.z for v in vs]
    ztop = max(zs)
    ring = [v.co for v in vs if ztop - lo < v.co.z < ztop - hi]
    xs = [c.x for c in ring]; ys = [c.y for c in ring]
    return ztop, (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, (max(xs) - min(xs)) / 2, (max(ys) - min(ys)) / 2

def add_cap(arm, mesh, color=(0.012, 0.02, 0.06), name='acc_cap', size=1.0, low=0.0):
    ztop, cx, cy, rx, ry = head_info(arm, mesh)
    rx *= 1.07 * size; ry *= 1.06 * size
    zb = ztop - 0.072 - low
    h = ztop - zb + 0.022
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=40, v_segments=20, radius=1.0)
    for v in list(bm.verts):
        if v.co.z < -0.30: bm.verts.remove(v)
    for v in bm.verts:
        # flatten the dome top a little and make the crown slightly boxier like a 6-panel cap
        v.co.z = max(v.co.z, -0.30)
    bmesh.ops.scale(bm, vec=(rx, ry, h), verts=bm.verts)
    # brim: front half-ellipse, pointing forward (-Y), angled down
    ring = bmesh.ops.create_circle(bm, cap_ends=True, segments=40, radius=1.0)
    bv = ring['verts']
    for v in bv:
        if v.co.y > 0.0: v.co.y = 0.0
        v.co.x *= rx * 0.95; v.co.y = v.co.y * ry * 0.85 - ry * 0.86; v.co.z = -0.24 * h
    for v in bv:
        d = -(v.co.y + ry * 0.86)
        if d > 0: v.co.z -= d * 0.22 + 0.8 * d * d
    bm.normal_update()
    o = new_obj(name, bm)
    sol = o.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = 0.005; sol.offset = 1.0
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier='sol')
    o.matrix_world = Matrix.Translation((cx, cy - 0.006, zb)) @ Matrix.Rotation(math.radians(-11), 4, 'X')
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True); o.select_set(False)
    o.data.materials.append(mat(name + '_mat', color, 0.92))
    bind(o, arm, 'Bip01 Head')
    return o

def z_ok(si):
    return si < 0

def ztop_off(arm, mesh, eye):
    vs = dominant_bone_verts(mesh, head_names(arm))
    return max(v.co.z for v in vs) - eye.z

def add_sunglasses(arm, mesh, name='acc_sunglasses'):
    B = arm.data.bones
    re, le = B['Bip01 REye'].head_local, B['Bip01 LEye'].head_local
    ztop, cx, cy, rx, ry = head_info(arm, mesh, lo=ztop_off(arm, mesh, re) + 0.01, hi=ztop_off(arm, mesh, re) - 0.01)
    bm = bmesh.new()
    fwd = 0.026
    done = set()
    for e, sx in ((re, -1), (le, 1)):
        # rounded-rectangle (superellipse) lens, extruded 4 mm, slightly wrapped toward the temples
        A, Bz, n = 0.029, 0.020, 5.0
        pts = []
        for k in range(36):
            t = 2 * math.pi * k / 36
            c, si = math.cos(t), math.sin(t)
            x = A * math.copysign(abs(c) ** (2 / n), c)
            z = Bz * math.copysign(abs(si) ** (2 / n), si) * (1.0 + 0.12 * (x * sx) / A if z_ok(si) else 1.0)
            pts.append(Vector((x, 0, z)))
        vf = [bm.verts.new(p) for p in pts]
        f = bm.faces.new(vf)
        ext = bmesh.ops.extrude_face_region(bm, geom=[f])
        nv = [g for g in ext['geom'] if isinstance(g, bmesh.types.BMVert)]
        bmesh.ops.translate(bm, vec=(0, 0.004, 0), verts=nv)
        vs = vf + nv
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(sx * 10), 3, 'Z'), verts=vs)
        bmesh.ops.translate(bm, vec=(e.x + sx * 0.003, e.y - fwd, e.z - 0.002), verts=vs)
    # bridge
    r = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(abs(le.x - re.x) - 0.045, 0.004, 0.004), verts=r['verts'])
    bmesh.ops.translate(bm, vec=((le.x + re.x) / 2, re.y - fwd, re.z + 0.006), verts=r['verts'])
    # temples back to ears
    for e, sx in ((re, -1), (le, 1)):
        r = bmesh.ops.create_cube(bm, size=1.0)
        L = 0.10
        bmesh.ops.scale(bm, vec=(0.003, L, 0.005), verts=r['verts'])
        x = e.x + sx * 0.041
        bmesh.ops.translate(bm, vec=(x, e.y - fwd + L / 2, e.z + 0.004), verts=r['verts'])
    o = new_obj(name, bm)
    o.data.materials.append(mat(name + '_mat', (0.01, 0.01, 0.012), 0.08, 0.6))
    bind(o, arm, 'Bip01 Head')
    return o

def add_whistle(arm, mesh, name='acc_whistle'):
    B = arm.data.bones
    neck = B['Bip01 Neck'].head_local; sp = B['Bip01 Spine2'].head_local
    bm = bmesh.new()
    r = bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.009, radius2=0.009, depth=0.03)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'Y'), verts=r['verts'])
    # chest front: find chest surface y at that height
    vs = [v.co for v in mesh.data.vertices if abs(v.co.z - (neck.z - 0.17)) < 0.02 and abs(v.co.x - neck.x) < 0.03]
    yfront = min(c.y for c in vs) if vs else neck.y - 0.12
    wpos = Vector((neck.x + 0.01, yfront - 0.012, neck.z - 0.17))
    bmesh.ops.translate(bm, vec=wpos, verts=r['verts'])
    # lanyard: two thin strands from neck sides to whistle
    for sx in (-1, 1):
        r = bmesh.ops.create_cube(bm, size=1.0)
        top = Vector((neck.x + sx * 0.055, neck.y - 0.02, neck.z + 0.02))
        d = wpos - top
        bmesh.ops.scale(bm, vec=(0.003, 0.003, d.length), verts=r['verts'])
        q = Vector((0, 0, 1)).rotation_difference(d.normalized())
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=q.to_matrix(), verts=r['verts'])
        bmesh.ops.translate(bm, vec=(top + wpos) / 2, verts=r['verts'])
    o = new_obj(name, bm)
    o.data.materials.append(mat(name + '_mat', (0.75, 0.75, 0.78), 0.25, 1.0))
    bind(o, arm, 'Bip01 Spine2')
    return o

def belly(arm, mesh, amp=0.07, zc=None, sigma=0.14):
    names = ['Bip01 Pelvis', 'Bip01 Spine', 'Bip01 Spine1', 'Bip01 Spine2', 'Bip01 L Thigh', 'Bip01 R Thigh']
    vs = dominant_bone_verts(mesh, names)
    hip = arm.data.bones['Bip01 Pelvis'].head_local.z
    if zc is None: zc = hip + 0.085
    me = mesh.data
    for v in vs:
        c = v.co; n = v.normal
        gz = math.exp(-((c.z - zc) / sigma) ** 2)
        if abs(c.x) > 0.24: continue
        front = max(0.0, -n.y)
        side = abs(n.x)
        k = amp * gz * (front * 1.0 + side * 0.45 + 0.08)
        # push mostly forward / sideways
        c += Vector((n.x * 0.8, n.y, n.z * 0.2)) * k

def add_apron(arm, mesh, color=(0.92, 0.9, 0.86), name='acc_apron', top=0.06, bottom=-0.42, half=0.16):
    """Waist apron (vendor / cook): a grid that follows the front of the body from just above the hips to the knees,
    skinned to the pelvis at the waist and blended onto both thighs below, so it moves with walking."""
    hip = arm.data.bones['Bip01 Pelvis'].head_local
    co = [v.co for v in mesh.data.vertices]
    nx, nz = 8, 10
    bm = bmesh.new(); grid = []
    yfront = None
    for j in range(nz + 1):
        z = hip.z + top + (bottom - top) * j / nz
        band = [c.y for c in co if abs(c.z - z) < 0.03 and abs(c.x - hip.x) < half]
        y = (min(band) if band else hip.y - 0.12) - 0.01
        yfront = y if yfront is None else min(yfront, y + 0.0)  # never tuck back in between the legs
        row = []
        for i in range(nx + 1):
            u = i / nx * 2 - 1
            x = hip.x + u * half * (1.0 + 0.08 * j / nz)
            row.append(bm.verts.new((x, y + 0.02 * u * u, z)))
        grid.append(row)
    for j in range(nz):
        for i in range(nx):
            bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    bm.normal_update()
    o = new_obj(name, bm)
    for f in o.data.polygons: f.use_smooth = True
    sol = o.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = 0.004; sol.offset = 1.0
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='sol')
    o.data.materials.append(mat(name + '_mat', color, 0.85))
    o.parent = arm
    gP = o.vertex_groups.new(name='Bip01 Pelvis'); gL = o.vertex_groups.new(name='Bip01 L Thigh'); gR = o.vertex_groups.new(name='Bip01 R Thigh')
    for v in o.data.vertices:
        d = max(0.0, min(1.0, (hip.z - v.co.z) / 0.3))          # 0 at the hips, 1 at mid-thigh
        s = max(0.0, min(1.0, (v.co.x - hip.x) / (2 * half) + 0.5))  # character's left side is +X in Blender here
        gP.add([v.index], 1 - d, 'REPLACE')
        if d > 0: gL.add([v.index], d * s, 'REPLACE'); gR.add([v.index], d * (1 - s), 'REPLACE')
    md = o.modifiers.new('Armature', 'ARMATURE'); md.object = arm
    return o
