extends Node2D

const BULLET = preload("res://scenes/bullet.tscn")

@export var attack_range := 200.0
@export var attack_speed := 1.0  # 每秒攻击次数
@export var damage := 25.0
@export var bullet_speed := 400.0

var current_target: CharacterBody2D = null
var attack_timer := 0.0
var can_attack := true

@onready var range_indicator = $RangeIndicator
@onready var turret = $Turret
@onready var muzzle = $Turret/Muzzle
@onready var detection_area = $DetectionArea

func _ready():
	# 设置检测范围
	var collision_shape = detection_area.get_node("CollisionShape2D")
	collision_shape.shape.radius = attack_range

	# 设置范围指示器
	range_indicator.scale = Vector2.ONE * attack_range / 50.0
	range_indicator.visible = false

	detection_area.body_entered.connect(_on_enemy_entered_range)
	detection_area.body_exited.connect(_on_enemy_exited_range)

func _process(delta):
	if current_target and is_instance_valid(current_target):
		# 旋转炮塔瞄准目标
		var direction = (current_target.global_position - turret.global_position).normalized()
		turret.rotation = direction.angle()

		# 攻击计时器
		if not can_attack:
			attack_timer += delta
			if attack_timer >= 1.0 / attack_speed:
				can_attack = true
				attack_timer = 0.0

		# 攻击
		if can_attack:
			shoot()
			can_attack = false
	else:
		# 寻找新目标
		find_target()

func find_target():
	var enemies = get_tree().get_nodes_in_group("enemies")
	var closest_enemy = null
	var closest_distance = attack_range

	for enemy in enemies:
		if is_instance_valid(enemy):
			var distance = global_position.distance_to(enemy.global_position)
			if distance < closest_distance:
				closest_enemy = enemy
				closest_distance = distance

	current_target = closest_enemy

func shoot():
	if not current_target or not is_instance_valid(current_target):
		return

	# 创建子弹
	var bullet = BULLET.instantiate()
	bullet.global_position = muzzle.global_position
	bullet.target = current_target
	bullet.damage = damage
	bullet.speed = bullet_speed
	# 添加到场景根节点，确保正确的碰撞检测
	get_tree().root.get_node("Main").add_child(bullet)

	print("塔开火! 目标:", current_target.name, " 伤害:", damage)

	# 开火粒子效果
	var muzzle_flash = $Turret/Muzzle/MuzzleFlash
	if muzzle_flash:
		muzzle_flash.emitting = true

func _on_enemy_entered_range(body):
	if body.is_in_group("enemies") and current_target == null:
		current_target = body

func _on_enemy_exited_range(body):
	if body == current_target:
		current_target = null

func _on_mouse_entered():
	range_indicator.visible = true

func _on_mouse_exited():
	range_indicator.visible = false
