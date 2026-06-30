// Hitung iuran sesi (v2) — cock dibagi PER GAME ke 4 pemainnya.
//
//   biaya_cock_game   = jumlah_cock_game x harga_cock_per_biji
//   porsi_per_pemain  = biaya_cock_game / 4
//   porsi_cock_pemain = jumlah porsi dari tiap game yang dia ikut
//   tagihan_pemain    = (non-member ? tarif_lapangan : 0) + porsi_cock_pemain
//
// attendees: [{ player_id, name, is_member, paid }]
// games:     [{ id, cock_used, played_at, playerIds: [] }]
// sesi:      { cock_price_per_piece, court_fee_nonmember }

export function hitungIuran(sesi, attendees, games) {
  const cockPrice = sesi?.cock_price_per_piece || 0
  const courtFee = sesi?.court_fee_nonmember || 0

  // Akumulasi porsi cock (mentah, masih pecahan) per pemain + jumlah game
  const cockShare = {}
  const gameCount = {}
  const cockCount = {}   // jumlah biji cock di game yang dia ikut (info)
  let totalCock = 0

  for (const g of games) {
    const ids = g.playerIds || []
    const n = ids.length || 4
    totalCock += g.cock_used || 0
    const perPlayer = n > 0 ? ((g.cock_used || 0) * cockPrice) / n : 0
    for (const pid of ids) {
      cockShare[pid] = (cockShare[pid] || 0) + perPlayer
      gameCount[pid] = (gameCount[pid] || 0) + 1
      cockCount[pid] = (cockCount[pid] || 0) + (g.cock_used || 0)
    }
  }

  // --- Pembulatan presisi (largest remainder) ---
  // Tiap porsi dibulatkan, tapi sisa rupiah dibagi ke yang pecahannya paling besar,
  // supaya JUMLAH semua porsi PERSIS sama dengan total biaya cock yang ditagihkan
  // (tidak meleset beberapa rupiah karena pembulatan).
  const raw = attendees.map(a => cockShare[a.player_id] || 0)
  const floors = raw.map(x => Math.floor(x))
  const targetSum = Math.round(raw.reduce((s, x) => s + x, 0))
  let sisa = targetSum - floors.reduce((s, x) => s + x, 0)
  const add = new Array(raw.length).fill(0)
  if (sisa > 0) {
    const byFrac = raw
      .map((x, i) => ({ i, f: x - Math.floor(x) }))
      .sort((a, b) => b.f - a.f)
    for (let k = 0; k < sisa && byFrac.length; k++) add[byFrac[k % byFrac.length].i] += 1
  }
  const cockRounded = floors.map((f, i) => f + add[i])

  const rows = attendees.map((a, i) => {
    const cock = cockRounded[i]
    const court = a.is_member ? 0 : courtFee
    return {
      player_id: a.player_id,
      name: a.name,
      is_member: a.is_member,
      paid: a.paid,
      gamesPlayed: gameCount[a.player_id] || 0,
      cockCount: cockCount[a.player_id] || 0,
      cockShare: cock,
      courtShare: court,
      total: court + cock,
    }
  }).sort((a, b) => a.name.localeCompare(b.name))

  const totalBiayaCock = totalCock * cockPrice
  const totalTagihan = rows.reduce((s, r) => s + r.total, 0)
  const totalLunas = rows.filter(r => r.paid).reduce((s, r) => s + r.total, 0)
  const totalBelum = totalTagihan - totalLunas
  const jumlahMember = rows.filter(r => r.is_member).length
  const jumlahNon = rows.length - jumlahMember
  const totalCourt = jumlahNon * courtFee   // pemasukan dari biaya lapangan
  // Orang yang masih punya tagihan > 0 tapi belum bayar (dipakai Beranda biar
  // member bertagihan Rp0 tidak bikin sesi terlihat "ada belum bayar").
  const adaBelumBayar = rows.some(r => !r.paid && r.total > 0)

  return {
    cockPrice, courtFee,
    totalCock, totalBiayaCock, totalCourt,
    rows,
    totalTagihan, totalLunas, totalBelum,
    jumlahMember, jumlahNon,
    jumlahGame: games.length,
    adaBelumBayar,
  }
}

export const rupiah = n => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')

// "X mnt lalu" ringkas
export function waktuLalu(iso) {
  if (!iso) return 'Belum main'
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'Baru aja'
  if (m < 60) return `${m} mnt lalu`
  return `${Math.floor(m / 60)} jam lalu`
}

// Nama bulan Indonesia dari tanggal ISO (yyyy-mm-dd) -> "Juni 2026"
export function namaBulan(iso) {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}
