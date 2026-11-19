import bpy, os, re
from mathutils import Matrix, Vector

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 30

def import_rocketbox(fbx):
    """Import a Rocketbox FBX, normalize names to 'Bip01 ...', apply transforms so the
    armature object is identity and units are meters. Returns (arm, meshes)."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=fbx, use_anim=False)
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        if o.type == 'EMPTY':
            bpy.data.objects.remove(o, do_unlink=True)
    new = [o for o in bpy.data.objects if o not in before]
    arm = [o for o in new if o.type == 'ARMATURE'][0]
    meshes = [o for o in new if o.type == 'MESH']
    # rename Bip02 -> Bip01 (children use Bip02)
    for b in arm.data.bones:
        if b.name.startswith('Bip02'):
            b.name = 'Bip01' + b.name[5:]
    for m in meshes:
        for vg in m.vertex_groups:
            if vg.name.startswith('Bip02'):
                vg.name = 'Bip01' + vg.name[5:]
    arm.name = 'Bip01'; arm.data.name = 'Bip01'
    # apply transforms (armature then meshes)
    bpy.ops.object.select_all(action='DESELECT')
    for o in [arm] + meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    if arm.animation_data: arm.animation_data_clear()
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return arm, meshes

BODY_BONES = None
def body_bones(arm):
    facial = re.compile(r'Bip01 (REye|LEye|MJaw|MBottomLip|MTongue|[LR]MouthBottom|[RL]Masseter|MUpperLip|[RL]Caninus|[RL]EyeBlink|[RL]Upperlip|[RL]MouthCorner|[RL]Cheek|[RL]InnerEyebrow|MMiddleEyebrow|[RL]OuterEyebrow|MNose)')
    return [b.name for b in arm.data.bones if not facial.match(b.name)]
