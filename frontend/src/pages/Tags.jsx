import { useState } from 'react';
import { useWorkspace } from '../context';
import { Empty, ErrorMessage, Modal } from '../components';
import Icon from '../icons';

function TagForm({ tag, onClose }) {
  const { mutate } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await mutate(
        tag ? `tags/${tag.id}/` : 'tags/',
        {
          method: tag ? 'PATCH' : 'POST',
          body: Object.fromEntries(new FormData(event.currentTarget)),
        },
        'Tag saved.',
      );
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return (
    <Modal title={tag ? 'Edit tag' : 'Create a tag'} onClose={onClose}>
      <form className="form-grid" onSubmit={save}>
        <ErrorMessage error={error} />
        <label>
          Tag name
          <input required autoFocus maxLength={40} name="name" defaultValue={tag?.name} />
        </label>
        <label>
          Color
          <input type="color" name="color" defaultValue={tag?.color || '#5264d9'} />
        </label>
        <div className="modal-actions span-2">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save tag'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Tags() {
  const { data, user, mutate } = useWorkspace();
  const [form, setForm] = useState(null);
  const [remove, setRemove] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function deleteTag() {
    setBusy(true);
    setError('');
    try {
      await mutate(`tags/${remove.id}/`, { method: 'DELETE' }, 'Tag removed.');
      setRemove(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A place for every kind of question</span>
          <h1>Small labels. Clear context.</h1>
          <p>Organize conversations with a shared vocabulary.</p>
        </div>
        {user.is_staff && (
          <button className="button primary" onClick={() => setForm({})}>
            <Icon name="plus" size={17} />
            Create tag
          </button>
        )}
      </div>
      <section className="panel tag-directory">
        <div className="panel-header">
          <h2>Conversation categories</h2>
          <span className="muted">{data.tags.length} tags</span>
        </div>
        {data.tags.length ? (
          data.tags.map((tag) => (
            <div className="tag-directory-row" key={tag.id}>
              <span
                className="tag-swatch"
                style={{ background: `${tag.color}16`, color: tag.color }}
              >
                <Icon name="tag" size={22} />
              </span>
              <div>
                <strong>{tag.name}</strong>
                <p>
                  {data.tickets.filter((ticket) => ticket.tags.includes(tag.id)).length}{' '}
                  conversations
                </p>
              </div>
              {user.is_staff && (
                <div className="heading-actions">
                  <button
                    className="icon-button"
                    aria-label={`Edit ${tag.name}`}
                    onClick={() => setForm(tag)}
                  >
                    <Icon name="edit" size={17} />
                  </button>
                  <button
                    className="icon-button danger-text"
                    aria-label={`Delete ${tag.name}`}
                    onClick={() => {
                      setError('');
                      setRemove(tag);
                    }}
                  >
                    <Icon name="trash" size={17} />
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <Empty title="Start with a useful label.">
            Create categories that match the questions your team receives.
          </Empty>
        )}
      </section>
      {form && <TagForm tag={form.id ? form : null} onClose={() => setForm(null)} />}
      {remove && (
        <Modal title="Remove this tag?" onClose={() => setRemove(null)}>
          <p className="modal-copy">
            “{remove.name}” will be removed from all conversations. The conversations themselves
            stay in your inbox.
          </p>
          <ErrorMessage error={error} />
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setRemove(null)}>
              Cancel
            </button>
            <button className="button danger" disabled={busy} onClick={deleteTag}>
              Remove tag
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
