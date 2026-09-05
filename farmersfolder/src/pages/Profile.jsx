export default function Profile({ t, lang, farmer, editingProfile, setEditingProfile, profileDraft, setProfileDraft, setProfileDraftFromFarmer, saveProfile }) {
  return (
    <div className="card pad-lg" style={{ maxWidth: 560 }}>
      <div className="section-title">
        <h2 style={{ fontSize: 17 }}>{t.profileTitle}</h2>
        {!editingProfile && (
          <button
            className="btn btn-ghost"
            onClick={() => {
              setProfileDraftFromFarmer();
              setEditingProfile(true);
            }}
          >
            {t.editProfile}
          </button>
        )}
      </div>
      {!farmer.landAcres && <div className="eligibility-box" style={{ borderColor: 'var(--critical)', background: 'var(--critical-soft)', marginBottom: 16 }}>{t.landRequired}</div>}
      {!editingProfile ? (
        <>
          <div className="field">
            <label>{t.fullName}</label>
            <div>{farmer.name}</div>
          </div>
          <div className="field">
            <label>{t.mobile}</label>
            <div>{farmer.mobile}</div>
          </div>
          <div className="field">
            <label>{t.location}</label>
            <div>{farmer.location}</div>
          </div>
          <div className="field">
            <label>{t.landArea}</label>
            <div>{farmer.landAcres ? `${farmer.landAcres} acres` : <span style={{ color: 'var(--critical)' }}>{t.notProvided}</span>}</div>
          </div>
          <div className="field">
            <label>
              {t.primaryCrop} ({lang === 'en' ? 'optional' : 'ఐచ్ఛికం'})
            </label>
            <div>{farmer.primaryCrop || <span style={{ color: 'var(--ink-muted)' }}>{t.notProvided}</span>}</div>
          </div>
          <div className="field">
            <label>{lang === 'en' ? 'Farmer ID' : 'ఫార్మర్ ఐడి'}</label>
            <div>
              {farmer.farmerId ? farmer.farmerId : <span style={{ color: 'var(--ink-muted)' }}>{lang === 'en' ? 'Not linked — verified via Aadhaar' : 'లింక్ లేదు — ఆధార్ ద్వారా ధృవీకరించబడింది'}</span>}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="field">
            <label>{t.fullName}</label>
            <input type="text" value={profileDraft.name} onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })} />
          </div>
          <div className="field">
            <label>{t.mobile}</label>
            <input type="text" value={profileDraft.mobile} disabled />
          </div>
          <div className="field">
            <label>{t.location}</label>
            <input type="text" value={profileDraft.location} onChange={(e) => setProfileDraft({ ...profileDraft, location: e.target.value })} />
          </div>
          <div className="field">
            <label>{t.landArea}</label>
            <input type="number" min="0" step="0.1" value={profileDraft.landAcres} onChange={(e) => setProfileDraft({ ...profileDraft, landAcres: e.target.value })} />
          </div>
          <div className="field">
            <label>
              {t.primaryCrop} ({lang === 'en' ? 'optional' : 'ఐచ్ఛికం'})
            </label>
            <input type="text" value={profileDraft.primaryCrop} onChange={(e) => setProfileDraft({ ...profileDraft, primaryCrop: e.target.value })} placeholder={lang === 'en' ? 'e.g. Paddy, Cotton' : 'ఉదా. వరి, పత్తి'} />
          </div>
          <div className="field">
            <label>
              {lang === 'en' ? 'Farmer ID' : 'ఫార్మర్ ఐడి'} ({lang === 'en' ? 'optional' : 'ఐచ్ఛికం'})
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength="11"
              value={profileDraft.farmerId}
              onChange={(e) => setProfileDraft({ ...profileDraft, farmerId: e.target.value.replace(/\D/g, '').slice(0, 11) })}
              placeholder="91234567890"
            />
          </div>
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setEditingProfile(false)}>
              {t.back}
            </button>
            <button className="btn btn-primary" disabled={!profileDraft.landAcres} onClick={saveProfile}>
              {t.saveProfile}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
