import { useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";

import { EmptyState } from "../../components/EmptyState";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDateTime } from "../../utils/format";
import { accessApi } from "../../api/client";

export function NighttimeRuleManagement({ data }) {
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    device: "",
    start_time: "22:00",
    end_time: "06:00",
    enabled: true,
  });

  const devicesWithRules = new Set(data.nighttimeRules.map((r) => r.device));
  const availableDevices = data.devices.filter((d) => !devicesWithRules.has(d.id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRule) {
        await accessApi.updateNighttimeRule(editingRule.id, formData);
      } else {
        await accessApi.createNighttimeRule(formData);
      }
      await data.refreshNighttimeRules();
      resetForm();
    } catch (error) {
      alert("操作失败：" + error.message);
    }
  };

  const handleDelete = async (rule) => {
    if (!confirm(`确定删除 ${rule.device_name} 的夜间规则？`)) return;
    try {
      await accessApi.deleteNighttimeRule(rule.id);
      await data.refreshNighttimeRules();
    } catch (error) {
      alert("删除失败：" + error.message);
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      device: rule.device,
      start_time: rule.start_time.slice(0, 5),
      end_time: rule.end_time.slice(0, 5),
      enabled: rule.enabled,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingRule(null);
    setFormData({
      device: "",
      start_time: "22:00",
      end_time: "06:00",
      enabled: true,
    });
  };

  return (
    <section className="view-stack">
      <header className="page-header">
        <div>
          <h1>夜间异常规则</h1>
          <p>配置指定时段内的拒绝开门告警提升规则，夜间异常将自动升级为高等级报警。</p>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)} type="button">
            <Plus size={16} />
            添加规则
          </button>
        )}
      </header>

      {showForm && (
        <div className="card">
          <h3>{editingRule ? "编辑规则" : "添加夜间规则"}</h3>
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-item">
              <label>设备</label>
              <select
                value={formData.device}
                onChange={(e) => setFormData({ ...formData, device: e.target.value })}
                disabled={!!editingRule}
                required
              >
                <option value="">选择设备</option>
                {editingRule
                  ? data.devices
                      .filter((d) => d.id === editingRule.device)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.device_code})
                        </option>
                      ))
                  : availableDevices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.device_code})
                      </option>
                    ))}
              </select>
            </div>
            <div className="form-item">
              <label>开始时间</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
            <div className="form-item">
              <label>结束时间</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
            <div className="form-item checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                />
                启用规则
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={resetForm}>
                取消
              </button>
              <button type="submit" className="btn btn-primary">
                {editingRule ? "保存修改" : "创建规则"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-panel">
        <table>
          <thead>
            <tr>
              <th>设备</th>
              <th>位置</th>
              <th>夜间时段</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {data.nighttimeRules.map((rule) => (
              <tr key={rule.id}>
                <td>
                  <strong>{rule.device_name}</strong>
                  <div className="muted">{rule.device_code}</div>
                </td>
                <td>
                  <MapPin size={15} />
                  {rule.device_location}
                </td>
                <td>
                  <span className="time-range">
                    {rule.start_time.slice(0, 5)} — {rule.end_time.slice(0, 5)}
                  </span>
                </td>
                <td>
                  <StatusBadge
                    value={rule.enabled ? "online" : "offline"}
                    label={rule.enabled ? "已启用" : "已停用"}
                  />
                </td>
                <td>{formatDateTime(rule.created_at)}</td>
                <td>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="btn btn-link"
                      onClick={() => handleEdit(rule)}
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      className="btn btn-link danger"
                      onClick={() => handleDelete(rule)}
                    >
                      <Trash2 size={14} />
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.nighttimeRules.length && <EmptyState />}
      </div>
    </section>
  );
}
